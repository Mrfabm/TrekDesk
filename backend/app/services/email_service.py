from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr
from typing import List, Dict, Any
from ..config import settings
import jinja2
import os

# Email configuration
conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=settings.USE_CREDENTIALS
)

# Initialize FastMail
fastmail = FastMail(conf)

# Initialize Jinja2 template environment
template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'email_templates')
template_env = jinja2.Environment(
    loader=jinja2.FileSystemLoader(template_dir)
)

async def send_email_notification(
    email: EmailStr,
    subject: str,
    template_name: str,
    template_data: Dict[str, Any]
) -> None:
    """
    Send an email notification using a template
    """
    try:
        # Get template
        template = template_env.get_template(f"{template_name}.html")
        
        # Render template with data
        html_content = template.render(**template_data)
        
        # Create message
        message = MessageSchema(
            subject=subject,
            recipients=[email],
            body=html_content,
            subtype="html"
        )
        
        # Send email
        await fastmail.send_message(message)
        return True
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        return False

async def send_urgent_notification(
    email: EmailStr,
    subject: str,
    message: str
) -> None:
    """
    Send an urgent notification email
    """
    try:
        # Create message with urgent styling
        html_content = f"""
        <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; border: 2px solid #ef4444;">
            <h2 style="color: #dc2626; margin-bottom: 16px;">⚠️ Urgent Notification</h2>
            <p style="color: #7f1d1d;">{message}</p>
        </div>
        """
        
        message = MessageSchema(
            subject=f"🚨 URGENT: {subject}",
            recipients=[email],
            body=html_content,
            subtype="html"
        )
        
        await fastmail.send_message(message)
        return True
    except Exception as e:
        print(f"Failed to send urgent email: {str(e)}")
        return False

async def send_alert_notification(
    email: EmailStr,
    subject: str,
    message: str,
    priority: str
) -> None:
    """
    Send an alert notification email with priority styling
    """
    try:
        # Define priority-based styles
        priority_styles = {
            "low": {"bg": "#f3f4f6", "border": "#9ca3af", "text": "#374151"},
            "medium": {"bg": "#fef3c7", "border": "#f59e0b", "text": "#92400e"},
            "high": {"bg": "#fee2e2", "border": "#ef4444", "text": "#991b1b"},
            "urgent": {"bg": "#dc2626", "border": "#7f1d1d", "text": "#ffffff"}
        }
        
        style = priority_styles.get(priority.lower(), priority_styles["medium"])
        
        html_content = f"""
        <div style="background-color: {style['bg']}; padding: 20px; border-radius: 8px; border: 2px solid {style['border']};">
            <h2 style="color: {style['text']}; margin-bottom: 16px;">Alert Notification</h2>
            <p style="color: {style['text']};">{message}</p>
        </div>
        """
        
        message = MessageSchema(
            subject=f"Alert: {subject}",
            recipients=[email],
            body=html_content,
            subtype="html"
        )
        
        await fastmail.send_message(message)
        return True
    except Exception as e:
        print(f"Failed to send alert email: {str(e)}")
        return False 