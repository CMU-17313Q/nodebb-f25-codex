/* eslint-disable strict */

const translatorApi = module.exports;

translatorApi.translate = async function (postData) {
	const TRANSLATOR_API = 'http://127.0.0.1:8080';

	try {
		const response = await fetch(`${TRANSLATOR_API}/?content=${encodeURIComponent(postData.content)}`);
		const data = await response.json();

		// Microservice returns:
		// {
		//   "is_english": true/false,
		//   "translated_content": "..."
		// }

		return [data.is_english, data.translated_content || ''];
	} catch (err) {
		console.error('Translator API error:', err);
		return [true, '']; // fallback: treat as English
	}
};
