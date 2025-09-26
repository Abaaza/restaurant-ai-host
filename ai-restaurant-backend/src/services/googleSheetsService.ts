import axios from 'axios';

interface GoogleSheetsLead {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  status: string;
  callDate?: string;
  notes?: string;
  addedDate: string;
}

export class GoogleSheetsService {
  private apiKey: string;
  private spreadsheetId: string;
  private sheetName: string = 'Leads';

  constructor() {
    this.apiKey = process.env.GOOGLE_SHEETS_API_KEY || '';
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID || '';
  }

  /**
   * Get uncalled leads from Google Sheets
   */
  async getUncalledLeads(): Promise<GoogleSheetsLead[]> {
    try {
      if (!this.apiKey || !this.spreadsheetId) {
        console.log('Google Sheets not configured');
        return [];
      }

      const range = `${this.sheetName}!A:G`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${range}?key=${this.apiKey}`;

      const response = await axios.get(url);
      const rows = response.data.values;

      if (!rows || rows.length === 0) {
        return [];
      }

      // Skip header row and parse data
      const leads: GoogleSheetsLead[] = [];
      for (let i = 1; i < rows.length; i++) {
        const [name, phone, email, status, callDate, notes, addedDate] = rows[i];

        // Only include leads with status 'New' or 'Callback Requested'
        if (status === 'New' || status === 'Callback Requested') {
          leads.push({
            id: `row_${i + 1}`,
            name: name || '',
            phone: this.normalizePhone(phone || ''),
            email: email || '',
            status: status || 'New',
            callDate: callDate || '',
            notes: notes || '',
            addedDate: addedDate || new Date().toISOString()
          });
        }
      }

      return leads;
    } catch (error: any) {
      console.error('Error fetching leads from Google Sheets:', error.message);
      return [];
    }
  }

  /**
   * Update lead status in Google Sheets
   */
  async updateLeadStatus(phone: string, status: string, notes?: string): Promise<boolean> {
    try {
      if (!this.apiKey || !this.spreadsheetId) {
        console.log('Google Sheets not configured');
        return false;
      }

      // First, find the row with this phone number
      const range = `${this.sheetName}!B:B`; // Phone column
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${range}?key=${this.apiKey}`;

      const response = await axios.get(url);
      const phoneNumbers = response.data.values;

      if (!phoneNumbers) {
        return false;
      }

      // Find the row index
      const normalizedPhone = this.normalizePhone(phone);
      let rowIndex = -1;
      for (let i = 1; i < phoneNumbers.length; i++) {
        if (this.normalizePhone(phoneNumbers[i][0]) === normalizedPhone) {
          rowIndex = i + 1; // +1 for 1-based indexing in Sheets
          break;
        }
      }

      if (rowIndex === -1) {
        console.log('Lead not found in Google Sheets');
        return false;
      }

      // Update the status and notes
      const updateRange = `${this.sheetName}!D${rowIndex}:F${rowIndex}`;
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${updateRange}?valueInputOption=RAW&key=${this.apiKey}`;

      const updateData = {
        values: [[
          status,
          new Date().toISOString(), // Call date
          notes || 'Updated by AI Agent'
        ]]
      };

      await axios.put(updateUrl, updateData);

      console.log(`Updated lead status for ${phone} to ${status}`);
      return true;
    } catch (error: any) {
      console.error('Error updating lead status:', error.message);
      return false;
    }
  }

  /**
   * Add a new lead to Google Sheets
   */
  async addLead(lead: Omit<GoogleSheetsLead, 'id'>): Promise<boolean> {
    try {
      if (!this.apiKey || !this.spreadsheetId) {
        console.log('Google Sheets not configured');
        return false;
      }

      const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${this.sheetName}:append?valueInputOption=RAW&key=${this.apiKey}`;

      const data = {
        values: [[
          lead.name,
          lead.phone,
          lead.email || '',
          lead.status || 'New',
          lead.callDate || '',
          lead.notes || '',
          lead.addedDate || new Date().toISOString()
        ]]
      };

      await axios.post(appendUrl, data);

      console.log(`Added new lead: ${lead.name}`);
      return true;
    } catch (error: any) {
      console.error('Error adding lead:', error.message);
      return false;
    }
  }

  /**
   * Get call statistics from Google Sheets
   */
  async getCallStatistics(): Promise<any> {
    try {
      if (!this.apiKey || !this.spreadsheetId) {
        return null;
      }

      const range = `${this.sheetName}!A:G`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${range}?key=${this.apiKey}`;

      const response = await axios.get(url);
      const rows = response.data.values;

      if (!rows || rows.length <= 1) {
        return null;
      }

      const stats = {
        total: rows.length - 1, // Exclude header
        new: 0,
        called: 0,
        booked: 0,
        notInterested: 0,
        callback: 0,
        noAnswer: 0
      };

      for (let i = 1; i < rows.length; i++) {
        const status = rows[i][3]; // Status column
        switch (status) {
          case 'New':
            stats.new++;
            break;
          case 'Called - Booked':
            stats.booked++;
            stats.called++;
            break;
          case 'Called - Not Interested':
            stats.notInterested++;
            stats.called++;
            break;
          case 'Callback Requested':
            stats.callback++;
            break;
          case 'Called - No Answer':
            stats.noAnswer++;
            stats.called++;
            break;
          default:
            if (status && status.startsWith('Called')) {
              stats.called++;
            }
        }
      }

      return stats;
    } catch (error: any) {
      console.error('Error fetching statistics:', error.message);
      return null;
    }
  }

  /**
   * Normalize phone number for comparison
   */
  private normalizePhone(phone: string): string {
    // Remove all non-digits
    return phone.replace(/\D/g, '');
  }

  /**
   * Batch update multiple leads
   */
  async batchUpdateLeads(updates: Array<{ phone: string; status: string; notes?: string }>): Promise<boolean> {
    try {
      // Process each update
      const results = await Promise.all(
        updates.map(update => this.updateLeadStatus(update.phone, update.status, update.notes))
      );

      const successCount = results.filter(r => r).length;
      console.log(`Batch update: ${successCount}/${updates.length} successful`);

      return successCount > 0;
    } catch (error: any) {
      console.error('Error in batch update:', error.message);
      return false;
    }
  }
}

export default new GoogleSheetsService();