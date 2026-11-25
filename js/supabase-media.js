/* Public media only. Unique object keys avoid overwriting existing files. */
window.HaadiyaMedia = (() => {
  const types = {"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif","video/mp4":"mp4","video/webm":"webm"};
  const bucket = "haadiya-media";
  const max = 50 * 1000 * 1000;
  function isUrl(v) {
    try { const u = new URL(v); return typeof v === "string" && u.protocol === "https:" && !u.username && !u.password; } catch (_) { return false; }
  }
  async function resolve(value, kind = "image") {
    if (value == null || value === "") return null;
    if (isUrl(value)) return value;
    if (!HaadiyaAuth.isAdmin() || !HaadiyaSupabase.client) throw Error("Verified admin access required for media upload.");
    let file = value;
    if (typeof value === "string" && /^data:(image\/(jpeg|png|webp|gif));base64,/i.test(value)) file = await (await fetch(value)).blob();
    else if (typeof value === "string") throw Error("Local media path cannot be shared. Upload the original file or use a public HTTPS URL.");
    if (!(file instanceof Blob) || !types[file.type] || !file.type.startsWith(kind+"/")) throw Error("Unsupported media type.");
    if (!file.size || file.size > max) throw Error("File must be smaller than 50 MB.");
    const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
    const path = kind + "/" + Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("") + "." + types[file.type];
    const storage = HaadiyaSupabase.client.storage.from(bucket);
    const {error} = await storage.upload(path,file,{contentType:file.type,cacheControl:"3600",upsert:false});
    if (error) throw Error("Media upload failed: " + error.message);
    const url = storage.getPublicUrl(path).data?.publicUrl;
    if (!isUrl(url)) throw Error("Storage did not return a valid public URL.");
    return url;
  }
  async function list(values) { if (!Array.isArray(values)) throw Error("Invalid photo list."); const out=[]; for(const v of values) {const u=await resolve(v);if(u)out.push(u);} return out; }
  async function colors(values) { const entries=[];for(const [k,v] of Object.entries(values||{})) entries.push([k,await list(v)]);return Object.fromEntries(entries); }
  return Object.freeze({isUrl,resolve,list,colors});
})();
