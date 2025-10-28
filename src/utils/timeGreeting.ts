export const getTimeBasedGreeting = (): string => {
  const now = new Date();
  const hour = now.getHours();
  
  if (hour >= 5 && hour < 12) {
    return 'Good Morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Good Afternoon';
  } else if (hour >= 17 && hour < 22) {
    return 'Good Evening';
  } else {
    return 'Good Evening';
  }
};

export const extractNameFromEmail = (email: string): string => {
  if (!email) return 'User';
  
  // Extract the part before @ symbol
  const localPart = email.split('@')[0];
  
  // Split by common separators (., _, -, +)
  const nameParts = localPart.split(/[._\-+]/);
  
  // Capitalize first letter of each part and join with space
  const formattedName = nameParts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
  
  return formattedName || 'User';
};

export const extractFirstNameFromEmail = (email: string): string => {
  if (!email) return 'User';
  
  // Extract the part before @ symbol
  const localPart = email.split('@')[0];
  
  // Split by common separators (., _, -, +)
  const nameParts = localPart.split(/[._\-+]/);
  
  // Return only the first part, capitalized
  const firstName = nameParts[0];
  return firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase() : 'User';
};

export const getGreetingWithName = (userType: 'superadmin' | 'admin' | 'user', email?: string): string => {
  const greeting = getTimeBasedGreeting();
  
  if (!email || !email.trim()) {
    // Fallback to role-based greeting if no email provided
    const title = userType === 'superadmin' ? 'Super Admin' : userType === 'admin' ? 'Admin' : 'User';
    return `${greeting}, ${title}`;
  }
  
  // Try to get first name from email
  const firstName = extractFirstNameFromEmail(email);
  return `${greeting}, ${firstName}`;
};