
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const config = {
    SUPABASE_URL: 'https://cwaayduboikqihempgbn.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3YWF5ZHVib2lrcWloZW1wZ2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNzI1MDMsImV4cCI6MjA4MDc0ODUwM30.mZULa8vhq_o4a6J631he9PCJy_iTwm2vhMWFtJ4AoCE'
};

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_KEY);

async function checkItems() {
    const { data: bills, error: billError } = await supabase
        .from('bills')
        .select('id, invoice_number')
        .limit(1)
        .order('created_at', { ascending: false });

    if (bills && bills.length > 0) {
        console.log('Latest Bill:', bills[0]);
        const { data: items, error } = await supabase
            .from('bill_items')
            .select('*')
            .eq('bill_id', bills[0].id);

        console.log('Items:', JSON.stringify(items, null, 2));
    }
}

checkItems();
