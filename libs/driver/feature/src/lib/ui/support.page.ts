import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { DriverApi } from '../driver-pwa-feature/driver.api'
import { DRIVER_FEATURE_CONFIG } from '../driver-pwa-feature/driver.routes'
import { HlmButtonImports } from '@spartan-ng/helm/button'
import { HlmCardImports } from '@spartan-ng/helm/card'
import { HlmInputImports } from '@spartan-ng/helm/input'
import { HlmLabelImports } from '@spartan-ng/helm/label'
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner'
import { HlmAlertImports } from '@spartan-ng/helm/alert'
import { HlmTextareaImports } from '@spartan-ng/helm/textarea'

@Component({
  selector: 'lib-support-page',
  imports: [
    FormsModule,
    HlmButtonImports,
    HlmCardImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSpinnerImports,
    HlmAlertImports,
    HlmTextareaImports,
  ],
  template: `
    <div class="page-container" [attr.dir]="fa() ? 'rtl' : 'ltr'">
      <header class="page-header">
        <h1>{{ fa() ? 'پشتیبانی و تماس با ما' : 'Support & Contact' }}</h1>
        <p class="page-subtitle">
          {{
            fa()
              ? 'برای ارسال تیکت پشتیبانی فرم زیر را پر کنید'
              : 'Fill out the form below to submit a support ticket'
          }}
        </p>
      </header>

      @if (submitting()) {
        <div class="loading-state">
          <hlm-spinner />
          <p>{{ fa() ? 'در حال ارسال تیکت...' : 'Submitting ticket...' }}</p>
        </div>
      } @else {
        <div class="support-content">
          <hlm-card class="support-card">
            <div hlmCardContent>
              <form (submit)="submitTicket($event)" class="support-form">
                <div class="form-field">
                  <label hlmLabel>{{ fa() ? 'موضوع' : 'Subject' }}</label>
                  <input
                    hlmInput
                    [(ngModel)]="formData.subject"
                    name="subject"
                    [disabled]="submitting()"
                    required
                    placeholder="{{ fa() ? 'موضوع تیکت را وارد کنید' : 'Enter ticket subject' }}"
                  />
                </div>

                <div class="form-field">
                  <label hlmLabel>{{ fa() ? 'دسته‌بندی' : 'Category' }}</label>
                  <select
                    hlmInput
                    [(ngModel)]="formData.category"
                    name="category"
                    [disabled]="submitting()"
                    required
                  >
                    <option value="">{{ fa() ? 'انتخاب دسته‌بندی' : 'Select category' }}</option>
                    <option value="technical">{{ fa() ? 'فنی و تکنیکی' : 'Technical' }}</option>
                    <option value="billing">
                      {{ fa() ? 'صورتحساب و پرداخت' : 'Billing & Payment' }}
                    </option>
                    <option value="account">{{ fa() ? 'حساب کاربری' : 'Account' }}</option>
                    <option value="route">{{ fa() ? 'مسیرها و سفرها' : 'Routes & Trips' }}</option>
                    <option value="other">{{ fa() ? 'سایر' : 'Other' }}</option>
                  </select>
                </div>

                <div class="form-field">
                  <label hlmLabel>{{ fa() ? 'اولویت' : 'Priority' }}</label>
                  <select
                    hlmInput
                    [(ngModel)]="formData.priority"
                    name="priority"
                    [disabled]="submitting()"
                    required
                  >
                    <option value="low">{{ fa() ? 'کم' : 'Low' }}</option>
                    <option value="medium" selected>{{ fa() ? 'متوسط' : 'Medium' }}</option>
                    <option value="high">{{ fa() ? 'بالا' : 'High' }}</option>
                    <option value="urgent">{{ fa() ? 'فوری' : 'Urgent' }}</option>
                  </select>
                </div>

                <div class="form-field">
                  <label hlmLabel>{{ fa() ? 'توضیحات' : 'Description' }}</label>
                  <textarea
                    hlmTextarea
                    [(ngModel)]="formData.message"
                    name="message"
                    [disabled]="submitting()"
                    required
                    rows="6"
                    placeholder="{{
                      fa()
                        ? 'شرح مشکل یا درخواست خود را بنویسید...'
                        : 'Describe your issue or request...'
                    }}"
                  ></textarea>
                  <p class="field-hint">
                    {{ fa() ? 'حداقل ۲۰ کاراکتر' : 'Minimum 20 characters' }}
                  </p>
                </div>

                @if (error()) {
                  <hlm-alert variant="destructive" class="form-error">
                    <p hlmAlertDescription>{{ error() }}</p>
                  </hlm-alert>
                }
                @if (success()) {
                  <hlm-alert variant="default" class="form-success">
                    <h4 hlmAlertTitle>
                      {{ fa() ? 'تیکت با موفقیت ارسال شد' : 'Ticket submitted successfully' }}
                    </h4>
                    <p hlmAlertDescription>
                      {{
                        fa()
                          ? 'تیکت پشتیبانی شما ثبت گردید. تیم پشتیبانی به زودی با شما تماس خواهد گرفت.'
                          : 'Your support ticket has been submitted. Our support team will contact you shortly.'
                      }}
                    </p>
                  </hlm-alert>
                }

                <div class="form-actions">
                  <button hlmBtn type="submit" [disabled]="submitting() || !isFormValid()">
                    {{
                      submitting()
                        ? fa()
                          ? 'در حال ارسال...'
                          : 'Submitting...'
                        : fa()
                          ? 'ارسال تیکت'
                          : 'Submit Ticket'
                    }}
                  </button>
                </div>
              </form>
            </div>
          </hlm-card>

          <hlm-card class="info-card" style="margin-top: 1.5rem;">
            <hlm-card-header>
              <h3 hlmCardTitle>{{ fa() ? 'راه‌های ارتباطی' : 'Contact Information' }}</h3>
            </hlm-card-header>
            <div hlmCardContent>
              <div class="contact-methods">
                <div class="contact-method">
                  <div class="contact-icon">
                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  </div>
                  <div class="contact-info">
                    <p class="contact-label">{{ fa() ? 'تلفن پشتیبانی' : 'Support Phone' }}</p>
                    <p class="contact-value">021-1234-5678</p>
                  </div>
                </div>
                <div class="contact-method">
                  <div class="contact-icon">
                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div class="contact-info">
                    <p class="contact-label">{{ fa() ? 'ایمیل پشتیبانی' : 'Support Email' }}</p>
                    <p class="contact-value">support@ttab.ir</p>
                  </div>
                </div>
                <div class="contact-method">
                  <div class="contact-icon">
                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div class="contact-info">
                    <p class="contact-label">{{ fa() ? 'ساعات پاسخگویی' : 'Support Hours' }}</p>
                    <p class="contact-value">
                      {{ fa() ? 'شنبه تا چهارشنبه، ۸ صبح تا ۴ عصر' : 'Sat-Wed, 8 AM - 4 PM' }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </hlm-card>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .page-container {
        padding: 1.5rem;
        max-width: 700px;
        margin: 0 auto;
      }
      .page-header {
        margin-bottom: 1.5rem;
      }
      .page-header h1 {
        font-size: 1.875rem;
        font-weight: 700;
        margin: 0 0 0.5rem;
      }
      .page-subtitle {
        color: var(--muted-foreground);
        margin: 0;
      }
      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 3rem;
      }
      .support-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .form-field {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }
      .form-field label[hlmLabel] {
        font-size: 0.875rem;
        font-weight: 500;
      }
      .form-field input,
      .form-field select,
      .form-field textarea[hlmTextarea] {
        width: 100%;
      }
      .field-hint {
        margin: 0.25rem 0 0;
        font-size: 0.75rem;
        color: var(--muted-foreground);
      }
      .form-error,
      .form-success {
        margin: 0.5rem 0;
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 0.5rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border);
      }
      .contact-methods {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .contact-method {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: var(--muted);
        border-radius: 0.5rem;
      }
      .contact-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 0.5rem;
        background: var(--primary);
        color: var(--primary-foreground);
        flex-shrink: 0;
      }
      .contact-info {
        flex: 1;
      }
      .contact-label {
        margin: 0 0 0.25rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--muted-foreground);
      }
      .contact-value {
        margin: 0;
        font-weight: 600;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupportPage {
  private readonly api = inject(DriverApi)
  private readonly config = inject(DRIVER_FEATURE_CONFIG)
  protected readonly fa = computed(() => this.config.language() === 'fa')

  protected readonly submitting = signal(false)
  protected readonly error = signal<string | null>(null)
  protected readonly success = signal(false)

  protected formData = {
    subject: '',
    category: '',
    priority: 'medium',
    message: '',
  }

  protected isFormValid(): boolean {
    return (
      this.formData.subject.trim().length > 0 &&
      this.formData.category.trim().length > 0 &&
      this.formData.message.trim().length >= 20
    )
  }

  protected async submitTicket(event: Event): Promise<void> {
    event.preventDefault()

    if (!this.isFormValid()) {
      this.error.set(
        this.fa()
          ? 'لطفاً تمام فیلدهای الزامی را پر کنید. توضیحات باید حداقل ۲۰ کاراکتر باشد.'
          : 'Please fill all required fields. Description must be at least 20 characters.',
      )
      return
    }

    this.submitting.set(true)
    this.error.set(null)
    this.success.set(false)

    try {
      await this.api.submitSupportTicket(this.formData.subject, this.formData.message)
      this.success.set(true)
      this.formData = { subject: '', category: '', priority: 'medium', message: '' }
    } catch {
      this.error.set(
        this.fa()
          ? 'ارسال تیکت ناموفق بود. لطفاً دوباره تلاش کنید.'
          : 'Failed to submit ticket. Please try again.',
      )
      this.success.set(false)
    } finally {
      this.submitting.set(false)
    }
  }
}
