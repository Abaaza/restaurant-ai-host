import * as cron from 'node-cron';
import googleSheetsService from './googleSheetsService';
import elevenLabsService from './elevenlabsService';
import supabaseService from './supabaseService';

interface OutboundLead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: string;
  notes?: string;
}

export class OutboundCallScheduler {
  private tasks: cron.ScheduledTask[] = [];
  private isRunning: boolean = false;
  private callQueue: OutboundLead[] = [];

  /**
   * Start the outbound call scheduler
   */
  async start() {
    if (this.isRunning) {
      console.log('Outbound scheduler already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting outbound call scheduler...');

    // Schedule lead checking every 30 minutes (9 AM to 6 PM)
    const leadCheckTask = cron.schedule('*/30 9-18 * * *', async () => {
      console.log('Checking for new leads...');
      await this.checkAndQueueLeads();
    });

    // Process call queue every 2 minutes
    const callProcessTask = cron.schedule('*/2 * * * *', async () => {
      await this.processCallQueue();
    });

    // Daily report at 7 PM
    const reportTask = cron.schedule('0 19 * * *', async () => {
      await this.generateDailyReport();
    });

    this.tasks.push(leadCheckTask, callProcessTask, reportTask);

    // Initial check on startup
    await this.checkAndQueueLeads();
  }

  /**
   * Stop the scheduler
   */
  stop() {
    this.isRunning = false;
    this.tasks.forEach(task => task.stop());
    this.tasks = [];
    console.log('Outbound scheduler stopped');
  }

  /**
   * Check Google Sheets and Supabase for leads to call
   */
  private async checkAndQueueLeads() {
    try {
      // Get leads from Google Sheets
      const sheetsLeads = await googleSheetsService.getUncalledLeads();

      // Get leads from Supabase
      const { data: dbLeads } = await supabaseService.getLeadsToCall();

      // Combine and deduplicate leads
      const allLeads = this.combineLeads(sheetsLeads, dbLeads || []);

      // Filter out leads already in queue
      const newLeads = allLeads.filter(
        lead => !this.callQueue.find(q => q.phone === lead.phone)
      );

      // Add to queue
      this.callQueue.push(...newLeads);

      console.log(`Added ${newLeads.length} leads to queue. Total in queue: ${this.callQueue.length}`);
    } catch (error) {
      console.error('Error checking leads:', error);
    }
  }

  /**
   * Process the call queue
   */
  private async processCallQueue() {
    if (!this.isRunning || this.callQueue.length === 0) {
      return;
    }

    // Check if we're within calling hours (9 AM to 6 PM)
    const now = new Date();
    const hour = now.getHours();
    if (hour < 9 || hour >= 18) {
      console.log('Outside calling hours');
      return;
    }

    // Take next lead from queue
    const lead = this.callQueue.shift();
    if (!lead) return;

    console.log(`Processing lead: ${lead.name} (${lead.phone})`);

    try {
      // Update lead status to 'calling'
      await this.updateLeadStatus(lead.id, 'calling');

      // Initiate call via ElevenLabs
      const result = await elevenLabsService.createPhoneCall({
        phoneNumber: lead.phone,
        metadata: {
          lead_id: lead.id,
          lead_name: lead.name,
          call_type: 'outbound',
          source: 'lead_queue'
        }
      });

      if (result.success) {
        console.log(`Call initiated for ${lead.name}`);

        // Create call log
        await supabaseService.createCallLog({
          call_type: 'outbound',
          phone_number: lead.phone,
          outcome: 'initiated',
          lead_id: lead.id,
          agent_notes: `Outbound call to ${lead.name}`
        });
      } else {
        console.error(`Failed to initiate call for ${lead.name}:`, result.error);

        // Put lead back in queue for retry
        this.callQueue.push(lead);
        await this.updateLeadStatus(lead.id, 'call_failed');
      }
    } catch (error) {
      console.error('Error processing lead:', error);

      // Put lead back in queue
      this.callQueue.push(lead);
    }
  }

  /**
   * Combine leads from different sources
   */
  private combineLeads(sheetsLeads: any[], dbLeads: any[]): OutboundLead[] {
    const combinedLeads: OutboundLead[] = [];

    // Add Google Sheets leads
    sheetsLeads.forEach(lead => {
      combinedLeads.push({
        id: lead.id || `sheets_${lead.phone}`,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        status: lead.status,
        notes: lead.notes
      });
    });

    // Add database leads
    dbLeads.forEach(lead => {
      // Check if not already added from sheets
      if (!combinedLeads.find(l => l.phone === lead.phone)) {
        combinedLeads.push({
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          status: lead.status,
          notes: lead.notes
        });
      }
    });

    return combinedLeads;
  }

  /**
   * Update lead status in both Google Sheets and database
   */
  private async updateLeadStatus(leadId: string, status: string) {
    try {
      // Update in database if it's a database lead
      if (!leadId.startsWith('sheets_')) {
        await supabaseService.updateLead(leadId, {
          status: status as any,
          last_called: new Date().toISOString()
        });
      }

      // Also update in Google Sheets if applicable
      if (leadId.startsWith('sheets_')) {
        const phone = leadId.replace('sheets_', '');
        await googleSheetsService.updateLeadStatus(phone, status);
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
    }
  }

  /**
   * Generate daily report
   */
  private async generateDailyReport() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get today's call logs
      const { data: calls } = await supabaseService.getCallLogs({
        date: today.toISOString()
      });

      const totalCalls = calls?.length || 0;
      const outboundCalls = calls?.filter(c => c.call_type === 'outbound').length || 0;
      const successfulBookings = calls?.filter(c => c.outcome === 'booked').length || 0;

      const report = {
        date: today.toISOString(),
        totalCalls,
        outboundCalls,
        successfulBookings,
        conversionRate: outboundCalls > 0 ? (successfulBookings / outboundCalls * 100).toFixed(2) : 0,
        remainingInQueue: this.callQueue.length
      };

      console.log('Daily Report:', report);

      // You could send this report via email, save to database, etc.
      // For now, we'll just log it
    } catch (error) {
      console.error('Error generating daily report:', error);
    }
  }

  /**
   * Manually add leads to queue
   */
  async addLeadsToQueue(leads: OutboundLead[]) {
    const newLeads = leads.filter(
      lead => !this.callQueue.find(q => q.phone === lead.phone)
    );

    this.callQueue.push(...newLeads);
    console.log(`Manually added ${newLeads.length} leads to queue`);
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      isRunning: this.isRunning,
      queueLength: this.callQueue.length,
      nextLeads: this.callQueue.slice(0, 5).map(l => ({
        name: l.name,
        phone: l.phone,
        status: l.status
      }))
    };
  }

  /**
   * Clear the queue
   */
  clearQueue() {
    const count = this.callQueue.length;
    this.callQueue = [];
    console.log(`Cleared ${count} leads from queue`);
    return count;
  }
}

export default new OutboundCallScheduler();