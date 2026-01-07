import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { wrapEmail, emailButton, emailInfoBox, emailDetailRow } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)

// Only allow in development mode
const isDevelopment = process.env.NODE_ENV === 'development'

export async function POST(request: NextRequest) {
  // Block in production unless explicitly enabled
  if (!isDevelopment && process.env.ENABLE_TEST_EMAIL !== 'true') {
    return NextResponse.json(
      { error: 'Test email endpoint is disabled in production' },
      { status: 403 }
    )
  }

  try {
    const { to, type } = await request.json()

    if (!to || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: to, type' },
        { status: 400 }
      )
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'hello@chirhoevents.com'

    console.log('[Test Email] Sending test email...')
    console.log('[Test Email] To:', to)
    console.log('[Test Email] Type:', type)
    console.log('[Test Email] From:', fromEmail)

    let subject = ''
    let html = ''

    switch (type) {
      case 'basic':
        subject = 'Test Email from ChiRho Events'
        html = wrapEmail(`
          <h1>Email System Working!</h1>
          <p>If you're seeing this, your Resend integration is working correctly.</p>

          ${emailInfoBox(`
            <strong>Test Details:</strong><br>
            Sent at: ${new Date().toLocaleString()}<br>
            From: ${fromEmail}<br>
            To: ${to}
          `, 'success')}

          <p><strong>Next step:</strong> Test your actual email templates!</p>
        `, { organizationName: 'ChiRho Events' })
        break

      case 'registration':
        subject = 'Registration Confirmation - Mount 2000 Summer 2026'
        html = wrapEmail(`
          <h1>Registration Confirmed!</h1>
          <p>Thank you for registering for <strong>Mount 2000 Summer 2026</strong>!</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background: #f9f9f9; border-radius: 8px; padding: 20px;">
            <tr>
              <td>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${emailDetailRow('Group', 'Test Youth Group')}
                  ${emailDetailRow('Participants', '15 people')}
                  ${emailDetailRow('Total Amount', '$1,500.00')}
                  ${emailDetailRow('Amount Paid', '$375.00 (Deposit)')}
                  ${emailDetailRow('Balance Due', '$1,125.00')}
                </table>
              </td>
            </tr>
          </table>

          <h2>Your Access Code</h2>
          <div style="background-color: #F5F1E8; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #1E3A5F; font-family: monospace; letter-spacing: 4px;">ABC123XY</span>
          </div>

          <h2>Next Steps</h2>
          <ol>
            <li>Complete liability forms for all participants</li>
            <li>Make final payment by July 1, 2026</li>
            <li>Upload Safe Environment certificates for chaperones</li>
          </ol>

          ${emailButton('Complete Liability Forms', 'https://chirhoevents.com/poros/ABC123XY', 'primary')}
          ${emailButton('Manage Registration', 'https://chirhoevents.com/dashboard/group-leader', 'secondary')}
        `, { organizationName: 'ChiRho Events' })
        break

      case 'access-code':
        subject = 'Your Access Code - Mount 2000 Summer 2026'
        html = wrapEmail(`
          <h1 style="text-align: center;">Your Group Access Code</h1>
          <p style="text-align: center;">Use this code to complete liability forms for all participants:</p>

          <div style="background-color: #F5F1E8; padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0;">
            <span style="font-size: 48px; font-weight: bold; color: #1E3A5F; font-family: monospace; letter-spacing: 6px;">ABC123XY</span>
          </div>

          <p style="text-align: center;">Share this code with parents and chaperones to complete their forms.</p>

          <div style="text-align: center;">
            ${emailButton('Complete Forms Now', 'https://chirhoevents.com/poros/ABC123XY', 'primary')}
          </div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0; background: #f9f9f9; border-radius: 8px; padding: 20px;">
            <tr>
              <td>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${emailDetailRow('Event', 'Mount 2000 Summer 2026')}
                  ${emailDetailRow('Group', 'Test Youth Group')}
                  ${emailDetailRow('Forms Due', 'July 8, 2026')}
                </table>
              </td>
            </tr>
          </table>
        `, { organizationName: 'ChiRho Events' })
        break

      case 'parent':
        subject = 'Complete Liability Form - Mount 2000 Summer 2026'
        html = wrapEmail(`
          <h1>Parent/Guardian Action Required</h1>

          <p>Hello,</p>

          <p>Your child <strong>John Doe</strong> is registered for <strong>Mount 2000 Summer 2026</strong>.</p>

          <p>As a parent/guardian, you need to complete the liability and medical information form before your child can participate.</p>

          ${emailInfoBox(`
            <strong>This link expires in 7 days</strong><br>
            Please complete the form as soon as possible.
          `, 'warning')}

          ${emailButton('Complete Form Now', 'https://chirhoevents.com/poros/parent/token123abc', 'primary')}

          <h2>What you'll need:</h2>
          <ul>
            <li>Medical information and current medications</li>
            <li>Emergency contact details</li>
            <li>Insurance information</li>
            <li>Dietary restrictions and allergies</li>
          </ul>

          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            This form was requested by Test Youth Group for Mount 2000 Summer 2026.
            If you did not expect this email, please contact the group leader.
          </p>
        `, { organizationName: 'ChiRho Events' })
        break

      case 'payment':
        subject = 'Payment Received - Mount 2000 Summer 2026'
        html = wrapEmail(`
          <h1>Payment Received</h1>

          <p>Thank you! We have received your payment for <strong>Mount 2000 Summer 2026</strong>.</p>

          ${emailInfoBox(`
            <strong>Amount Paid:</strong> $375.00<br>
            <strong>Date:</strong> ${new Date().toLocaleDateString()}<br>
            <strong>Method:</strong> Credit Card (Visa ****4242)
          `, 'success')}

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background: #f9f9f9; border-radius: 8px; padding: 20px;">
            <tr>
              <td>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${emailDetailRow('Total Amount Due', '$1,500.00')}
                  ${emailDetailRow('Amount Paid', '$375.00')}
                  ${emailDetailRow('Remaining Balance', '$1,125.00')}
                </table>
              </td>
            </tr>
          </table>

          ${emailInfoBox(`
            <strong>Note:</strong> You still have an outstanding balance of $1,125.00.
            Please make your final payment before the event.
          `, 'warning')}

          ${emailButton('View Payment History', 'https://chirhoevents.com/dashboard/group-leader/payments', 'primary')}
        `, { organizationName: 'ChiRho Events' })
        break

      case 'org-welcome':
        subject = 'Welcome to ChiRho Events!'
        html = wrapEmail(`
          <h1>Welcome to ChiRho Events!</h1>

          <p>Dear Test Admin,</p>

          <p>Congratulations! Your organization <strong>Test Diocese Events</strong> has been approved and your account is now active.</p>

          ${emailInfoBox(`
            <strong>Your Subscription:</strong> Professional<br>
            <strong>Organization:</strong> Test Diocese Events
          `, 'success')}

          <h2>Getting Started</h2>
          <p>Here's what you can do with ChiRho Events:</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
                <strong style="color: #1E3A5F;">1. Create Your First Event</strong>
                <p style="margin: 4px 0 0; color: #666; font-size: 14px;">Set up registration, pricing tiers, and deadlines</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
                <strong style="color: #1E3A5F;">2. Customize Liability Forms</strong>
                <p style="margin: 4px 0 0; color: #666; font-size: 14px;">Configure youth, chaperone, and clergy forms for your diocese</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
                <strong style="color: #1E3A5F;">3. Invite Your Team</strong>
                <p style="margin: 4px 0 0; color: #666; font-size: 14px;">Add staff members and assign roles</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0;">
                <strong style="color: #1E3A5F;">4. Configure Payments</strong>
                <p style="margin: 4px 0 0; color: #666; font-size: 14px;">Connect Stripe to accept online payments</p>
              </td>
            </tr>
          </table>

          ${emailButton('Access Your Dashboard', 'https://chirhoevents.com/dashboard', 'primary')}

          <p>Welcome to the ChiRho family. We're honored to serve your ministry!</p>
        `, { organizationName: 'ChiRho Events' })
        break

      default:
        return NextResponse.json({ error: 'Invalid email type. Valid types: basic, registration, access-code, parent, payment, org-welcome' }, { status: 400 })
    }

    const data = await resend.emails.send({
      from: `ChiRho Events <${fromEmail}>`,
      reply_to: 'support@chirhoevents.com',
      to,
      subject,
      html,
    })

    console.log('[Test Email] Email sent successfully!')
    console.log('[Test Email] Resend ID:', data.id)

    return NextResponse.json({
      success: true,
      messageId: data.id,
      message: `${type} email sent to ${to}`,
    })
  } catch (error) {
    console.error('[Test Email] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to send email',
        details: error,
      },
      { status: 500 }
    )
  }
}

// GET endpoint to show test form
export async function GET() {
  // Block in production unless explicitly enabled
  if (!isDevelopment && process.env.ENABLE_TEST_EMAIL !== 'true') {
    return NextResponse.json(
      { error: 'Test email endpoint is disabled in production' },
      { status: 403 }
    )
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>ChiRho Events - Email Testing</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 600px;
          margin: 50px auto;
          padding: 20px;
          background: #f5f5f5;
        }
        .container {
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #1E3A5F; margin-top: 0; }
        .subtitle { color: #666; margin-bottom: 30px; }
        .form-group { margin: 20px 0; }
        label { display: block; margin-bottom: 8px; font-weight: 600; color: #333; }
        input, select {
          width: 100%;
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.2s;
        }
        input:focus, select:focus {
          outline: none;
          border-color: #1E3A5F;
        }
        button {
          background: #1E3A5F;
          color: white;
          padding: 14px 28px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          width: 100%;
          transition: background 0.2s;
        }
        button:hover { background: #2A4A7F; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        .result {
          margin-top: 20px;
          padding: 15px;
          border-radius: 8px;
          display: none;
        }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .email-types {
          background: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          font-size: 14px;
        }
        .email-types h3 { margin-top: 0; color: #1E3A5F; }
        .email-types ul { margin: 0; padding-left: 20px; }
        .email-types li { margin: 5px 0; }
        .warning {
          background: #fff3cd;
          border: 1px solid #ffc107;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
          color: #856404;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>ChiRho Events Email Testing</h1>
        <p class="subtitle">Test your Resend email integration</p>

        <div class="warning">
          <strong>Development Only:</strong> This endpoint is only available in development mode.
        </div>

        <form id="testForm">
          <div class="form-group">
            <label for="email">Your Email:</label>
            <input type="email" id="email" required placeholder="your@email.com">
          </div>

          <div class="form-group">
            <label for="type">Email Type:</label>
            <select id="type">
              <option value="basic">Basic Test Email</option>
              <option value="registration">Registration Confirmation</option>
              <option value="access-code">Access Code Email</option>
              <option value="parent">Parent Liability Form</option>
              <option value="payment">Payment Confirmation</option>
              <option value="org-welcome">Organization Welcome</option>
            </select>
          </div>

          <button type="submit" id="submitBtn">Send Test Email</button>
        </form>

        <div id="result" class="result"></div>

        <div class="email-types">
          <h3>Available Test Templates:</h3>
          <ul>
            <li><strong>basic</strong> - Simple test to verify email works</li>
            <li><strong>registration</strong> - Group registration confirmation</li>
            <li><strong>access-code</strong> - Access code for liability forms</li>
            <li><strong>parent</strong> - Parent liability form request</li>
            <li><strong>payment</strong> - Payment received confirmation</li>
            <li><strong>org-welcome</strong> - New organization welcome</li>
          </ul>
        </div>
      </div>

      <script>
        document.getElementById('testForm').addEventListener('submit', async (e) => {
          e.preventDefault();

          const email = document.getElementById('email').value;
          const type = document.getElementById('type').value;
          const resultDiv = document.getElementById('result');
          const submitBtn = document.getElementById('submitBtn');

          submitBtn.disabled = true;
          submitBtn.textContent = 'Sending...';
          resultDiv.style.display = 'none';

          try {
            const response = await fetch('/api/test-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: email, type })
            });

            const data = await response.json();

            if (data.success) {
              resultDiv.className = 'result success';
              resultDiv.innerHTML = '<strong>Success!</strong> Email sent. Check your inbox (and spam folder).';
            } else {
              throw new Error(data.error || 'Failed to send');
            }
          } catch (error) {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = '<strong>Error:</strong> ' + error.message;
          }

          resultDiv.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Test Email';
        });
      </script>
    </body>
    </html>
  `

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
