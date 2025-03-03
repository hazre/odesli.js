/**
 * Odesli - A wrapper for the Odesli (song.link) API
 * @typedef {import('.').Page.Response} PageResponse
 * @typedef {import('.').CountryCode} CountryCode
 * @typedef {import('.').entityType} entityType
 */

class Odesli {
  /**
   * Create an Odesli instance
   * @param {Object} [options] - Configuration options
   * @param {string} [options.apiKey] - Optional: Limited to 10 Requests per Minute without an API Key
   * @param {string} [options.version='v1-alpha.1'] - Optional: Defaults to 'v1-alpha.1'
   */
  constructor({
    apiKey,
    version = 'v1-alpha.1'
  } = {}) {
    this.apiKey = apiKey;
    this.version = version || 'v1-alpha.1';
  }

  /**
   * Make a request to the Odesli API
   * @private
   * @param {string} path - API path to request
   * @returns {Promise<any>} API response
   * @throws {Error} If the request fails
   */
  async _request(path) {
    const url = `https://api.song.link/${this.version}/${path}${this.apiKey ? `&key=${this.apiKey}` : ''}`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const statusCode = response.status;
        let errorMessage = `Error: ${statusCode}`;
        
        if (statusCode === 429) {
          errorMessage = `${statusCode}: Rate limited. Without an API key, you are limited to 10 requests per minute.`;
        } else if (statusCode >= 400 && statusCode < 500) {
          errorMessage = `${statusCode}: Request failed with the provided information.`;
        } else if (statusCode >= 500) {
          errorMessage = `${statusCode}: Odesli server error.`;
        }
        
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (err) {
      if (err.message.includes('Unexpected token')) {
        throw new Error('API returned an unexpected result.');
      }
      throw err;
    }
  }

  /**
   * Fetch song/album links by URL
   * @param {string} url - Streaming service URL
   * @param {CountryCode} [country='US'] - ISO 3166-1 Alpha-2 country code
   * @returns {Promise<PageResponse>} Song/album data
   * @throws {Error} If the URL is not provided or the request fails
   */
  async fetch(url, country = 'US') {
    if (!url) throw new Error('No URL was provided to odesli.fetch()');
    const path = `links?url=${encodeURIComponent(url)}&userCountry=${country}`;
    return await this._request(path);
  }

  /**
   * Fetch song/album links by platform, type, and ID
   * @param {string} platform - Streaming service platform
   * @param {entityType} type - Entity type (song or album)
   * @param {string} id - Entity ID
   * @param {CountryCode} [country='US'] - ISO 3166-1 Alpha-2 country code
   * @returns {Promise<PageResponse>} Song/album data
   * @throws {Error} If any required parameters are missing or the request fails
   */
  async getByParams(platform, type, id, country = 'US') {
    if (!platform) throw new Error('No `platform` was provided to odesli.getByParams()');
    if (!type) throw new Error('No `type` was provided to odesli.getByParams()');
    if (!id) throw new Error('No `id` was provided to odesli.getByParams()');

    // If they happen to input the full id (PLATFORM_SONG::UNIQUEID), just get the UNIQUEID
    id = id.replace(/[^::]+::/g, '');
    const path = `links?platform=${platform}&type=${type}&id=${id}&userCountry=${country}`;
    return await this._request(path);
  }

  /**
   * Fetch song/album links by entity ID
   * @param {string} id - Entity ID in the format 'PLATFORM_TYPE::UNIQUEID'
   * @param {CountryCode} [country='US'] - ISO 3166-1 Alpha-2 country code
   * @returns {Promise<PageResponse>} Song/album data
   * @throws {Error} If the ID is not provided, is in an invalid format, or the request fails
   */
  async getById(id, country = 'US') {
    if (!id) throw new Error('No `id` was provided to odesli.getById()');
    if (!id.match(/\w+_\w+::\w+/g)) throw new Error('Provided Entity ID does not match format `<PLATFORM>_<SONG|ALBUM>::<UNIQUEID>`');

    // Convert string into separate params
    const platform = id.replace(/_\w+::\w+/g, '').toLowerCase();
    const type = id.replace(/\w+_/g, '').replace(/::\w+/g, '').toLowerCase();
    const uniqueId = id.replace(/\w+::/g, '');

    const path = `links?platform=${platform}&type=${type}&id=${uniqueId}&userCountry=${country}`;
    return await this._request(path);
  }
}

export default Odesli;