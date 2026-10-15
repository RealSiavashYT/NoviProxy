// نمایش نشان ON روی آیکون وقتی پروکسی SOCKS5 فعال است
async function syncBadge() {
  try {
    const cfg = await chrome.proxy.settings.get({ incognito: false });
    const single = cfg.value && cfg.value.rules && cfg.value.rules.singleProxy;
    const on = cfg.value.mode === 'fixed_servers' && single && single.scheme === 'socks5';
    await chrome.action.setBadgeText({ text: on ? 'ON' : '' });
    await chrome.action.setBadgeBackgroundColor({ color: '#7C6CFF' });
    await chrome.action.setBadgeTextColor?.({ color: '#FFFFFF' });
  } catch (e) {
    console.error('noviproxy badge error', e);
  }
}

chrome.runtime.onInstalled.addListener(syncBadge);
chrome.runtime.onStartup.addListener(syncBadge);
chrome.proxy.settings.onChange.addListener(syncBadge);
