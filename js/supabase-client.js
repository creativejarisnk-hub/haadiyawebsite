/* Supabase browser client, with persistent Auth session. */
window.HaadiyaSupabase = (() => {
  const url = 'https://oynqvkhpeiqmgdwwayaa.supabase.co';
  const key = 'sb_publishable_VfvsJfATNumUlC-qLvnCWA_WeRH-Wyw';
  let client = null;
  let initializationError = null;
  try {
    if (typeof window.supabase?.createClient !== 'function') {
      throw new Error('Supabase SDK could not be loaded. Check internet access.');
    }
    client = window.supabase.createClient(url, key, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }
    });
  } catch (error) {
    initializationError = error.message;
    console.warn('[Haadiya] Supabase client unavailable:', initializationError);
  }

  async function checkConnection() {
    if (!client) return { ok: false, message: initializationError };
    try {
      const { data, error } = await client.from('site_content')
        .select('id').eq('id', 'main').maybeSingle();
      if (error) return { ok: false, message: error.message, code: error.code || null };
      if (data?.id !== 'main') return { ok: false, message: 'Record main not found or not readable.' };
      return { ok: true, message: 'Supabase connected; site_content/main is readable.' };
    } catch (error) {
      return { ok: false, message: error.message || 'Connection failed.' };
    }
  }
  return Object.freeze({ client, checkConnection });
})();
