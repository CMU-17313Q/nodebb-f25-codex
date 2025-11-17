/* eslint-disable strict */

const translatorApi = module.exports;

translatorApi.translate = async function (postData) {
	const TRANSLATOR_API = 'http://crs-17313-codex-gpu.qatar.cmu.edu/';

	try {
		const response = await fetch(
			`${TRANSLATOR_API}/?content=${encodeURIComponent(postData.content)}`
		);

		const data = await response.json();

		return [data.is_english, data.translated_content || ''];
	} catch (err) {
		console.error('Translator API error:', err);

		// FORCE BUTTON TO ALWAYS SHOW FOR NOW
		return [false, postData.content];
	}
};
