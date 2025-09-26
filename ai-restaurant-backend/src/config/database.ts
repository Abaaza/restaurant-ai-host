import supabaseService from '../services/supabaseService';

export async function initializeDatabase() {
  try {
    // Test connection by making a simple query
    const { data, error } = await supabaseService.getAppointments({
      date: new Date().toISOString()
    });

    if (error) {
      throw error;
    }

    console.log('Database connection established');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}