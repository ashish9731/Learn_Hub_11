import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, userEmail, userName, tempPassword, companyName, adminName, courses } = await req.json()

    let subject = ''
    let htmlContent = ''

    if (type === 'admin_created') {
      subject = 'Admin Invitation - LearnHub'
      htmlContent = getAdminInviteTemplate(userName, userEmail, tempPassword, companyName)
    } else if (type === 'user_created') {
      subject = 'Welcome to LearnHub!'
      htmlContent = getUserInviteTemplate(userName, userEmail, tempPassword, companyName)
    } else if (type === 'course_assigned') {
      subject = 'New Courses Assigned - LearnHub'
      htmlContent = getCourseAssignmentTemplate(userName, companyName, courses, adminName)
    } else {
      throw new Error('Invalid email type')
    }

    // Send email using Supabase's built-in SMTP
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'LearnHub <learnhubone@gmail.com>',
        to: [userEmail],
        subject: subject,
        html: htmlContent,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Email sending failed:', error)
      throw new Error(`Failed to send email: ${error}`)
    }

    const result = await response.json()
    console.log('Email sent successfully:', result)

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

// Admin invitation email template
function getAdminInviteTemplate(adminName: string, adminEmail: string, tempPassword: string, companyName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Invitation - LearnHub</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 40px 20px;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 40px 30px;
        }
        .credentials-box {
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            border: 2px solid #667eea;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            text-align: center;
        }
        .credential-item {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            margin: 10px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .credential-value {
            font-family: 'Courier New', monospace;
            background: #f7fafc;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 16px;
            color: #2d3748;
            border: 1px solid #e2e8f0;
        }
        .password-highlight {
            background: #fed7d7 !important;
            border: 2px solid #f56565 !important;
            color: #c53030 !important;
            font-weight: bold;
            font-size: 18px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 Admin Invitation - LearnHub</h1>
            <p>You've been invited to manage learning at ${companyName}</p>
        </div>
        
        <div class="content">
            <p><strong>Hello ${adminName}!</strong></p>
            
            <p>Congratulations! You have been invited as an <strong>Administrator</strong> for <strong>${companyName}</strong> on the LearnHub learning management platform.</p>
            
            <div class="credentials-box">
                <h3>🔐 Your Admin Login Credentials</h3>
                
                <div class="credential-item">
                    <span>Email:</span>
                    <span class="credential-value">${adminEmail}</span>
                </div>
                
                <div class="credential-item">
                    <span>Temporary Password:</span>
                    <span class="credential-value password-highlight">${tempPassword}</span>
                </div>
            </div>
            
            <div style="text-align: center;">
                <a href="https://learnhub2.netlify.app/" class="cta-button">
                    🚀 Access Admin Dashboard
                </a>
            </div>
            
            <p>You can change your password later in your profile settings if needed.</p>
        </div>
    </div>
</body>
</html>
  `
}

// User invitation email template
function getUserInviteTemplate(userName: string, userEmail: string, tempPassword: string, companyName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to LearnHub</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
            color: white;
            text-align: center;
            padding: 40px 20px;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 40px 30px;
        }
        .credentials-box {
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            border: 2px solid #4299e1;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            text-align: center;
        }
        .credential-item {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            margin: 10px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .credential-value {
            font-family: 'Courier New', monospace;
            background: #f7fafc;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 16px;
            color: #2d3748;
            border: 1px solid #e2e8f0;
        }
        .password-highlight {
            background: #fed7d7 !important;
            border: 2px solid #f56565 !important;
            color: #c53030 !important;
            font-weight: bold;
            font-size: 18px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📚 Welcome to LearnHub!</h1>
            <p>Your learning journey at ${companyName} begins now</p>
        </div>
        
        <div class="content">
            <p><strong>Hello ${userName}!</strong></p>
            
            <p>Welcome to LearnHub! You have been invited to join <strong>${companyName}</strong> on our comprehensive learning management platform.</p>
            
            <div class="credentials-box">
                <h3>🔐 Your Login Credentials</h3>
                
                <div class="credential-item">
                    <span>Email:</span>
                    <span class="credential-value">${userEmail}</span>
                </div>
                
                <div class="credential-item">
                    <span>Temporary Password:</span>
                    <span class="credential-value password-highlight">${tempPassword}</span>
                </div>
            </div>
            
            <div style="text-align: center;">
                <a href="https://learnhub2.netlify.app/" class="cta-button">
                    🎯 Start Learning Now
                </a>
            </div>
            
            <p>You can change your password later in your profile settings if needed.</p>
        </div>
    </div>
</body>
</html>
  `
}

// Course assignment email template
function getCourseAssignmentTemplate(userName: string, companyName: string, courses: any[], adminName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Courses Assigned - LearnHub</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            color: white;
            text-align: center;
            padding: 40px 20px;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 40px 30px;
        }
        .course-item {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            margin: 10px 0;
            border-left: 4px solid #48bb78;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📖 New Courses Assigned!</h1>
            <p>Continue your learning journey at ${companyName}</p>
        </div>
        
        <div class="content">
            <p><strong>Hello ${userName}!</strong></p>
            
            <p>Great news! New learning content has been assigned to you by <strong>${adminName}</strong> at <strong>${companyName}</strong>.</p>
            
            <h3>📚 Your New Course Assignments:</h3>
            ${courses.map(course => `
                <div class="course-item">
                    <div><strong>📖 ${course.title}</strong></div>
                    <div>${course.description || 'New learning content assigned to you'}</div>
                </div>
            `).join('')}
            
            <div style="text-align: center;">
                <a href="https://learnhub2.netlify.app/" class="cta-button">
                    🎯 Access Your Courses
                </a>
            </div>
        </div>
    </div>
</body>
</html>
  `
}