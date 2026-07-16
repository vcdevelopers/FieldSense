import logging
import datetime
from django.utils import timezone
from apscheduler.schedulers.background import BackgroundScheduler
from django_apscheduler.jobstores import DjangoJobStore, register_events
from django.contrib.auth.models import User

from field_tracking.reports.generator import generate_report_data
from field_tracking.reports.pdf_builder import build_pdf_report
from field_tracking.reports.mailer import send_report_email

logger = logging.getLogger(__name__)

def generate_and_send(period_name, days):
    try:
        logger.info(f"Generating {period_name} report...")
        end_date = timezone.now()
        start_date = end_date - datetime.timedelta(days=days)
        
        data = generate_report_data(start_date, end_date)
        pdf_buffer = build_pdf_report(data)
        
        admins = User.objects.filter(is_superuser=True).exclude(email='')
        admin_emails = [admin.email for admin in admins]
        
        if not admin_emails:
            # Fallback if no superusers have emails
            admin_emails = ['noreply@vibecopilot.ai']
            
        for email in admin_emails:
            send_report_email(email, period_name, pdf_buffer)
            
        logger.info(f"Successfully sent {period_name} report to {admin_emails}")
    except Exception as e:
        logger.error(f"Error generating {period_name} report: {str(e)}")

def daily_report():
    generate_and_send('Daily', 1)

def weekly_report():
    generate_and_send('Weekly', 7)

def monthly_report():
    generate_and_send('Monthly', 30)

def yearly_report():
    generate_and_send('Yearly', 365)

def start():
    scheduler = BackgroundScheduler()
    # It is recommended to use DjangoJobStore so jobs persist across restarts
    scheduler.add_jobstore(DjangoJobStore(), "default")
    
    scheduler.add_job(daily_report, 'cron', hour=17, minute=30, name='daily_report', jobstore='default', replace_existing=True)
    scheduler.add_job(weekly_report, 'cron', day_of_week='mon', hour=8, minute=0, name='weekly_report', jobstore='default', replace_existing=True)
    scheduler.add_job(monthly_report, 'cron', day='1', hour=8, minute=0, name='monthly_report', jobstore='default', replace_existing=True)
    scheduler.add_job(yearly_report, 'cron', month='1', day='1', hour=8, minute=0, name='yearly_report', jobstore='default', replace_existing=True)
    
    register_events(scheduler)
    scheduler.start()
    print("APScheduler started!")
