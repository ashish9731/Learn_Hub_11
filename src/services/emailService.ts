// Email service for sending notifications through Supabase Auth
import { supabase } from '../lib/supabase';

// Send admin invitation email
export const sendAdminCreatedEmail = async (
  adminEmail: string,
  adminName: string,
  tempPassword: string,
  companyName: string
): Promise<boolean> => {
  try {
    console.log('📧 Sending admin invitation email to:', adminEmail);
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'admin_created',
        userEmail: adminEmail,
        userName: adminName,
        tempPassword: tempPassword,
        companyName: companyName
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Email sending failed:', errorText);
      
      // Still show popup for backup
      alert(`Admin Created Successfully!\n\nEmail: ${adminEmail}\nTemporary Password: ${tempPassword}\n\nNote: Email sending failed, please share these credentials manually.`);
      return false;
    }

    const result = await response.json();
    console.log('✅ Admin email sent successfully:', result);
    
    // Show success popup
    alert(`Admin Created Successfully!\n\nEmail: ${adminEmail}\nTemporary Password: ${tempPassword}\n\n✅ Invitation email sent to ${adminEmail}`);
    return true;
  } catch (error) {
    console.error('❌🔥🔥🔥 ADMIN FORM - EMAIL SENDING EXCEPTION:', error);
    
    // Still show popup for backup
    alert(`Admin Created Successfully!\n\nEmail: ${adminEmail}\nTemporary Password: ${tempPassword}\n\nNote: Email sending failed, please share these credentials manually.`);
    return false;
  }
}

// Send user invitation email
export const sendUserCreatedEmail = async (
  userEmail: string,
  userName: string,
  tempPassword: string,
  companyName: string
): Promise<boolean> => {
  try {
    console.log('📧 Sending user invitation email to:', userEmail);
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'user_created',
        userEmail: userEmail,
        userName: userName,
        tempPassword: tempPassword,
        companyName: companyName
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Email sending failed:', errorText);
      
      // Still show popup for backup
      alert(`User Created Successfully!\n\nEmail: ${userEmail}\nTemporary Password: ${tempPassword}\n\nNote: Email sending failed, please share these credentials manually.`);
      return false;
    }

    const result = await response.json();
    console.log('✅ User email sent successfully:', result);
    
    // Show success popup
    alert(`User Created Successfully!\n\nEmail: ${userEmail}\nTemporary Password: ${tempPassword}\n\n✅ Invitation email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error('❌🔥🔥🔥 USER FORM - EMAIL SENDING EXCEPTION:', error);
    
    // Still show popup for backup
    alert(`User Created Successfully!\n\nEmail: ${userEmail}\nTemporary Password: ${tempPassword}\n\nNote: Email sending failed, please share these credentials manually.`);
    return false;
  }
}

// Send course assignment email
export const sendCourseAssignedEmail = async (
  userEmail: string,
  userName: string,
  companyName: string,
  courses: any[],
  adminName: string
): Promise<boolean> => {
  try {
    console.log('📧 Sending course assignment email to:', userEmail);
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'course_assigned',
        userEmail: userEmail,
        userName: userName,
        companyName: companyName,
        courses: courses,
        adminName: adminName
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Course assignment email sending failed:', errorText);
      return false;
    }

    const result = await response.json();
    console.log('✅ Course assignment email sent successfully:', result);
    return true;
  } catch (error) {
    console.error('❌ COURSE ASSIGNMENT - EMAIL SENDING EXCEPTION:', error);
    return false;
  }
}