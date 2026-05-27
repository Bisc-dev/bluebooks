import { supabase } from './supabase';

export async function pushNotify({ recipientEmail, body, url }) {
  try {
    await supabase.functions.invoke('send-push', {
      body: { recipientEmail, title: 'BlueBooks', body, url },
    });
  } catch {
    // Push errors are non-critical — in-app notification still shows
  }
}
