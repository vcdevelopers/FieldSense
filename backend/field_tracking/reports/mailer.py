from django.core.mail import EmailMessage
from django.conf import settings

def send_report_email(admin_email, period_str, pdf_buffer):
    """
    Sends the generated PDF report to the admin email.
    """
    subject = f"Field Operations Analytical Report - {period_str}"
    body = (
        f"Hello Admin,\n\n"
        f"Please find attached the Field Operations Analytical Report for the period: {period_str}.\n"
        f"The report includes key metrics, visual analysis of meetings and distance traveled, "
        f"as well as the full MOMs and Site Visit checklists submitted during this time.\n\n"
        f"Regards,\nField Senses System"
    )
    
    email = EmailMessage(
        subject,
        body,
        settings.EMAIL_HOST_USER,
        [admin_email],
    )
    
    # Attach the PDF
    email.attach(f"Field_Ops_Report_{period_str}.pdf", pdf_buffer.getvalue(), 'application/pdf')
    
    # Send
    email.send(fail_silently=False)
