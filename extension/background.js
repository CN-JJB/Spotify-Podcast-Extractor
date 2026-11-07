chrome.action.onClicked.addListener(async (tab) => {
  const url = new URL(chrome.runtime.getURL("export.html"));
  if (tab.id != null) url.searchParams.set("tab", String(tab.id));
  await chrome.tabs.create({url: url.href});
});
