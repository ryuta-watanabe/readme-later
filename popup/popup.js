// Readme Laterフォルダの情報を取得する
const getParentBookmarkFolder = async () => {
	return await chrome.bookmarks.search({ title: 'Readme Later' });
};
// 現在開いているタブの情報を取得する
const getCurrentTab = async () => {
	const currentTab = await chrome.tabs.query({
		active: true,
		currentWindow: true,
	});
	return currentTab[0];
};

// ブックマークに保存する
const saveBookmark = async (bookmark) => {
	const parentBookmarkFolder = await getParentBookmarkFolder();
	await chrome.bookmarks.create({
		parentId: parentBookmarkFolder[0].id,
		title: bookmark.title,
		url: bookmark.url,
	});
};

//

// 開いているページをブックマーク保存する
const saveButton = document.getElementById('save');
saveButton.addEventListener(
	'click',
	async () => await saveBookmark(await getCurrentTab())
);
