import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { PASSENGER_FEATURE_CONFIG } from '../passenger.routes'

@Component({
  selector: 'lib-passenger-support-page',
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <h1>{{ fa() ? 'راهنمایی و پشتیبانی' : 'Help and support' }}</h1>
      <p>
        {{ fa() ? 'راه‌های ارتباط با پشتیبانی شرکت' : 'Ways to reach your transport provider' }}
      </p>
    </div>
    <section class="panel stack">
      <h2>
        {{
          fa() ? 'ثبت درخواست پشتیبانی در دسترس نیست' : 'Support request submission is unavailable'
        }}
      </h2>
      <p>
        {{
          fa()
            ? 'سرویس ثبت درخواست وجود دارد، اما نوع درخواست موردنیاز و قرارداد تماس مسافر هنوز در برنامه تأیید نشده است. برای جلوگیری از ارسال درخواست ناقص، ثبت درخواست غیرفعال است.'
            : 'The backend has a ticket-creation endpoint, but the required support type and passenger contact contract have not been confirmed for this app. Submission is disabled to avoid sending incomplete tickets.'
        }}
      </p>
      <a class="secondary" routerLink="/passenger/home">{{
        fa() ? 'بازگشت به خانه' : 'Back to home'
      }}</a>
    </section>
  `,
  styleUrl: './passenger.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassengerSupportPage {
  private readonly config = inject(PASSENGER_FEATURE_CONFIG)
  protected readonly fa = computed(() => this.config.language() === 'fa')
}
