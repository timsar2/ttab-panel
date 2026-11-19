import { Injectable, OnDestroy, computed, isDevMode, signal } from '@angular/core'
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  LogLevel,
} from '@microsoft/signalr'
import {
  NOTIFICATION_FROM_SERVER,
  TrackingConnectionState,
  TrackingHubConfig,
} from './tracking.models'

type NotificationListener = (payload: unknown) => void

function notificationKind(typeName: unknown): string {
  if (typeof typeName !== 'string') return ''
  const dot = typeName.lastIndexOf('.')
  return dot >= 0 ? typeName.slice(dot + 1) : typeName
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

/**
 * Reusable transport for the backend's NotificationFromServer envelope.
 * Passenger apps should use the same-origin cookie stream so JWTs stay on the server;
 * configure/connect remain available to trusted non-cookie consumers of the library.
 */
@Injectable({ providedIn: 'root' })
export class NotificationConnectionService implements OnDestroy {
  private connection: HubConnection | null = null
  private eventSource: EventSource | null = null
  private eventSourceUrl: string | null = null
  private config: TrackingHubConfig | null = null
  private startPromise: Promise<void> | null = null
  private readonly listeners = new Map<string, Set<NotificationListener>>()

  readonly state = signal<TrackingConnectionState>('disconnected')
  readonly connected = computed(() => this.state() === 'connected')
  readonly error = signal<string | null>(null)

  /** Subscribe to a backend notification type, e.g. LocationNotification. */
  on<T>(channel: string, listener: (payload: T) => void): () => void {
    const key = notificationKind(channel)
    const channelListeners = this.listeners.get(key) ?? new Set<NotificationListener>()
    const typedListener: NotificationListener = payload => listener(payload as T)
    channelListeners.add(typedListener)
    this.listeners.set(key, channelListeners)
    let subscribed = true
    return () => {
      if (!subscribed) return
      subscribed = false
      channelListeners.delete(typedListener)
      if (!channelListeners.size && this.listeners.get(key) === channelListeners)
        this.listeners.delete(key)
    }
  }

  async configure(config: TrackingHubConfig): Promise<void> {
    if (this.config?.hubUrl === config.hubUrl && this.connection) {
      this.log('SignalR configuration already initialized', { hubUrl: config.hubUrl })
      return
    }
    await this.disposeTransport()
    this.config = config
    this.log('Initializing SignalR hub connection', { hubUrl: config.hubUrl })

    const connection = new HubConnectionBuilder()
      .withUrl(config.hubUrl, {
        withCredentials: config.withCredentials ?? true,
        transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
        accessTokenFactory: async () => {
          const token = await config.accessTokenFactory?.()
          return token ?? ''
        },
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build()

    connection.on(NOTIFICATION_FROM_SERVER, (typeName: unknown, payload: unknown) => {
      console.log('NOTIFICATION_FROM_SERVER recived')
      this.dispatch(typeName, payload, 'signalr')
    })
    connection.onreconnecting(error => {
      this.log('SignalR reconnecting', error)
      this.state.set('reconnecting')
    })
    connection.onreconnected(connectionId => {
      this.log('SignalR reconnected', { connectionId })
      this.state.set('connected')
    })
    connection.onclose(error => {
      this.log('SignalR connection closed', error)
      this.state.set('disconnected')
      this.error.set(error?.message ?? null)
    })
    this.connection = connection
  }

  async connect(): Promise<void> {
    const connection = this.connection
    if (!connection) throw new Error('Notification hub is not configured.')
    if (connection.state === HubConnectionState.Connected) {
      this.state.set('connected')
      return
    }
    if (this.startPromise) return this.startPromise
    this.state.set(
      connection.state === HubConnectionState.Reconnecting ? 'reconnecting' : 'connecting',
    )
    this.log('Starting SignalR negotiation/connection', { state: connection.state })
    this.startPromise = connection
      .start()
      .then(() => {
        this.error.set(null)
        this.state.set('connected')
        this.log('SignalR connected')
      })
      .catch(error => {
        this.log('SignalR connection failed', error)
        this.state.set('disconnected')
        this.error.set(
          error instanceof Error ? error.message : 'Failed to connect to notification hub.',
        )
        throw error
      })
      .finally(() => {
        this.startPromise = null
      })
    return this.startPromise
  }

  /** Same-origin bridge used by browser apps so upstream JWTs never reach browser JS. */
  async connectCookieStream(streamUrl = '/api/auth/tracking-stream'): Promise<void> {
    if (this.eventSource && this.eventSourceUrl === streamUrl) {
      this.log('Notification stream is already initialized', { streamUrl })
      return
    }
    await this.disposeTransport()
    this.config = null

    this.state.set('connecting')
    this.error.set(null)
    this.log('Initializing notification stream (SSE)', { streamUrl, withCredentials: true })
    let source: EventSource
    try {
      source = new EventSource(streamUrl, { withCredentials: true })
    } catch (error) {
      this.state.set('disconnected')
      this.error.set(
        error instanceof Error ? error.message : 'Could not initialize notification stream.',
      )
      this.log('Notification stream initialization failed', error)
      throw error
    }
    this.eventSource = source
    this.eventSourceUrl = streamUrl
    source.onopen = () => {
      this.error.set(null)
      this.state.set('connected')
      this.log('Notification stream connected', { streamUrl, readyState: source.readyState })
    }
    source.onmessage = event => {
      try {
        if (isDevMode()) console.info('[SSE] Raw event received', event.data)
        const envelope = asRecord(JSON.parse(event.data) as unknown)
        if (!envelope) throw new Error('Notification envelope must be an object.')
        if (isDevMode()) console.info('[SSE] Notification type identified', envelope['typeName'])
        this.dispatch(envelope['typeName'], envelope['payload'], 'event-stream')
      } catch (error) {
        this.log('Notification stream received invalid event data', error)
        this.error.set('The notification stream returned an invalid event.')
      }
    }
    source.onerror = () => {
      const closed = source.readyState === EventSource.CLOSED
      this.warn('Notification stream error', {
        readyState: source.readyState,
        url: streamUrl,
        state: closed ? 'closed' : 'reconnecting',
      })
      this.state.set(closed ? 'disconnected' : 'reconnecting')
      this.error.set(
        closed ? 'The notification stream was closed.' : 'The notification stream is reconnecting.',
      )
    }
  }

  async disconnect(): Promise<void> {
    await this.disposeTransport()
    this.state.set('disconnected')
  }

  ngOnDestroy(): void {
    void this.disposeTransport()
    this.listeners.clear()
  }

  private dispatch(typeName: unknown, payload: unknown, transport: string): void {
    const kind = notificationKind(typeName)
    if (!kind) return
    if (isDevMode())
      console.info('[notifications] event received', {
        transport,
        channel: kind,
        typeName,
        payload,
      })
    for (const listener of this.listeners.get(kind) ?? []) {
      try {
        listener(payload)
      } catch (error) {
        this.warn(`Notification channel listener failed: ${kind}`, error)
      }
    }
  }

  private log(message: string, details?: unknown): void {
    if (isDevMode()) console.info(`[notifications] ${message}`, details ?? '')
  }

  private warn(message: string, details?: unknown): void {
    if (isDevMode()) console.warn(`[notifications] ${message}`, details ?? '')
  }

  private async disposeTransport(): Promise<void> {
    this.eventSource?.close()
    this.eventSource = null
    this.eventSourceUrl = null
    const connection = this.connection
    this.connection = null
    this.startPromise = null
    if (!connection) return
    try {
      connection.off(NOTIFICATION_FROM_SERVER)
      if (connection.state !== HubConnectionState.Disconnected) await connection.stop()
    } catch {
      /* Ignore transport cleanup errors. */
    } finally {
      this.state.set('disconnected')
    }
  }
}
