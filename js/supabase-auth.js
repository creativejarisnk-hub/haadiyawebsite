/* Admin authentication. UI state is not a security boundary: database writes
   must be independently enforced by RLS. No legacy password or flag is trusted. */
window.HaadiyaAuth = (() => {
  const client = window.HaadiyaSupabase.client;
  let pending = true, admin = false, busy = false, generation = 0;
  let initialized = false;
  try { sessionStorage.removeItem('haadiya_admin'); } catch (_) {}

  function setState(allowed, waiting = false) {
    const changed = admin !== allowed || pending !== waiting;
    admin = allowed;
    pending = waiting;
    if (changed) document.dispatchEvent(new CustomEvent('haadiya:auth-change'));
  }

  async function verifyMembership() {
    const { data, error } = await client.auth.getUser();
    if (error || !data?.user) return { ok: false, message: 'Unable to verify your session. Please sign in again.' };
    const result = await client.from('admin_users').select('user_id')
      .eq('user_id', data.user.id).maybeSingle();
    if (result.error) return { ok: false, message: 'Unable to verify admin access. Please try again.' };
    if (result.data?.user_id !== data.user.id) return { ok: false, message: 'This account does not have admin access.' };
    return { ok: true };
  }

  async function revalidate() {
    if (busy) return;
    const ticket = ++generation;
    let allowed = false;
    try {
      if (client) {
        const { data, error } = await client.auth.getSession();
        if (!error && data?.session) allowed = (await verifyMembership()).ok;
      }
    } catch (_) { /* fail closed */ }
    if (ticket === generation && !busy) setState(allowed);
  }

  function initialize() {
    if (initialized) return;
    initialized = true;
    if (client) {
      client.auth.onAuthStateChange((event) => {
        // Do not call async Supabase methods inside the SDK auth callback.
        if (event === 'SIGNED_OUT') {
          ++generation;
          setState(false);
        } else if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
          if (!busy) setTimeout(revalidate, 0);
        }
      });
      window.addEventListener('focus', () => { if (admin) revalidate(); });
    }
    return revalidate();
  }

  async function signIn(email, password) {
    if (!client) return { ok: false, message: 'Connection unavailable. Check your internet and reload.' };
    if (busy) return { ok: false, message: 'Please wait for the current sign-in request.' };
    busy = true;
    ++generation;
    setState(false);
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data?.session) return { ok: false, message: 'Sign in failed. Check your email, password, and internet connection.' };
      const result = await verifyMembership();
      if (!result.ok) {
        try { await client.auth.signOut({ scope: 'local' }); } catch (_) {}
        return result;
      }
      setState(true);
      return { ok: true };
    } catch (_) {
      try { await client.auth.signOut({ scope: 'local' }); } catch (_) {}
      return { ok: false, message: 'Unable to sign in. Check your internet connection and try again.' };
    } finally { busy = false; }
  }

  async function signOut() {
    if (busy) return { ok: false, message: 'Another authentication request is running.' };
    busy = true;
    ++generation;
    setState(false);
    try {
      if (!client) return { ok: true };
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) return { ok: false, message: 'Sign-out could not be fully verified. Please retry if your session returns.' };
      return { ok: true };
    } catch (_) {
      return { ok: false, message: 'Sign-out could not be fully verified. Check your internet connection.' };
    } finally { busy = false; }
  }

  return Object.freeze({ initialize, signIn, signOut, isAdmin: () => admin, isPending: () => pending });
})();
