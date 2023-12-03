// Readme Laterフォルダを作成する
const createReadmeLaterFolder = async () => {
	await chrome.bookmarks.create({
		title: 'Readme Later',
	});
};

// Readme Laterフォルダが存在するかをチェックする
const isFolderExist = async () => {
	const folder = await chrome.bookmarks.search({ title: 'Readme Later' });
	return folder.length > 0;
};

// Readme LaterフォルダのIDを取得する
const getReadmeLaterFolderId = async () => {
	const readmeLater = await chrome.bookmarks.search({
		title: 'Readme Later',
	});
	return readmeLater[0].id ? readmeLater[0].id : null;
};

// 翌日のAM10時を設定する
const getTimestampForNextAlarm = () => {
	const now = new Date();
	const nextAlarm = new Date();
	nextAlarm.setHours(10, 0, 0, 0);

	if (now > nextAlarm) {
		nextAlarm.setDate(nextAlarm.getDate() + 1);
	}

	return nextAlarm.getTime();
};

// 拡張機能のインストール時、もしくは更新時にブックマークフォルダを作成する
const handleInstalledEvent = async (details) => {
	const exists = await isFolderExist();
	// 拡張機能のインストール時、もしくは更新時以外では何もしない
	if (details.reason !== 'install' && details.reason !== 'update') return;
	// フォルダが存在しない場合のみ、ブックマークフォルダを作る
	if (!exists) {
		await createReadmeLaterFolder();
	}
	// バッジにテキストをセットする
	await chrome.action.setBadgeText({
		text: 'SAVE',
	});
	// 翌日10時にアラームをセットして、それ以降毎日10時にアラームが起動する設定
	await chrome.alarms.create('readmeLater-alarm', {
		periodInMinutes: 1440,
		when: getTimestampForNextAlarm(),
	});
};

// 拡張機能インストール時のイベントリスナ登録
chrome.runtime.onInstalled.addListener(async (details) => {
	await handleInstalledEvent(details);
});

// ブックマークに保存する
const saveBookmark = async (title, url) => {
	const readmeLaterId = await getReadmeLaterFolderId();

	if (readmeLaterId) {
		await chrome.bookmarks.create({
			parentId: readmeLaterId,
			title: title,
			url: url,
		});
	}
};

// ブックマーク完了通知を表示する
const showBookmarkNotification = async (bookmark) => {
	const options = {
		type: 'basic',
		title: 'Readme Later',
		message: `${bookmark.title}をブックマークしました`,
		iconUrl: `${bookmark.favIconUrl}`,
	};
	await chrome.notifications.create(bookmark.url, options);
};

// ストレージにブックマーク情報を保存
const saveBookmarkToStorage = async (bookmark) => {
	const bookmarks = await chrome.storage.local.get('bookmarks');
	bookmarks.bookmarks = bookmarks.bookmarks ? bookmarks.bookmarks : [];
	bookmarks.bookmarks.push(bookmark);
	await chrome.storage.local.set({ bookmarks: bookmarks.bookmarks });
};

// バッジクリック時のイベント処理
const handleBadgeClickedEvent = async (tab) => {
	const date = new Date();
	const createdAt = new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate()
	);
	const bookmark = {
		title: tab.title,
		url: tab.url,
		favIconUrl: tab.favIconUrl,
		createdAt: `${createdAt}`,
	};
	await saveBookmark(tab.title, tab.url);
	await saveBookmarkToStorage(bookmark);
	await showBookmarkNotification(bookmark);
};

// TODO: ストレージのブックマーク情報を取得

// TODO: ストレージのブックマーク情報を更新

// TODO: ストレージのブックマーク情報を削除

// 拡張機能のバッジをクリックしたときのイベントリスナ登録
chrome.action.onClicked.addListener(async (tab) => {
	if (tab.active) await handleBadgeClickedEvent(tab);
});

// 通知をチェックする関数;
const handleAlarmEvent = async () => {
	const date = new Date();
	const yesterday = new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate() - 1
	);

	// ブックマークの情報を取得
	const bookmarks = await chrome.storage.local.get('bookmarks');

	// オブジェクトが空じゃないときのみ実行
	if (Object.keys(bookmarks).length > 0) {
		// ブックマークごとにチェック
		bookmarks.bookmarks.map(async (bookmark) => {
			const createdAt = new Date(bookmark.createdAt);

			// 今日とブックマークした日付を比較
			if (createdAt.getTime() == yesterday.getTime()) {
				const options = {
					type: 'basic',
					title: 'Readme Later',
					message: `${bookmark.title}はチェックしましたか？`,
					iconUrl: `${bookmark.favIconUrl}`,
				};

				// 通知を表示
				await chrome.notifications.create(bookmark.url, options);
			}
		});
	}
};

chrome.alarms.onAlarm.addListener(async (alarm) => {
	if (alarm.name === 'readmeLater-alarm') await handleAlarmEvent();
});

chrome.notifications.onClicked.addListener(async (notificationId) => {
	await chrome.tabs.create({ url: notificationId });
	const bookmarks = await chrome.storage.local.get('bookmarks');
	const filterdBookmarks = bookmarks.bookmarks.filter(
		(bookmark) => bookmark.url !== notificationId
	);
	await chrome.storage.local.set({ bookmarks: filterdBookmarks });
});
