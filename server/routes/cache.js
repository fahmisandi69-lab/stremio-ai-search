const logger = require("../../utils/logger");

function registerCacheRoutes({ router, routePath, validateAdminToken, saveCachesToFiles }) {
  router.get(routePath + "cache/stats", validateAdminToken, (req, res) => {
    const { getCacheStats } = require("../../addon");
    res.json(getCacheStats());
  });

  router.get(routePath + "cache/clear/tmdb", validateAdminToken, (req, res) => {
    const { clearTmdbCache } = require("../../addon");
    res.json(clearTmdbCache());
  });

  router.get(routePath + "cache/clear/tmdb-details", validateAdminToken, (req, res) => {
    const { clearTmdbDetailsCache } = require("../../addon");
    res.json(clearTmdbDetailsCache());
  });

  router.get(routePath + "cache/clear/tmdb-discover", validateAdminToken, (req, res) => {
    const { clearTmdbDiscoverCache } = require("../../addon");
    res.json(clearTmdbDiscoverCache());
  });

  router.get(routePath + "cache/clear/ai", validateAdminToken, (req, res) => {
    const { clearAiCache } = require("../../addon");
    res.json(clearAiCache());
  });

  router.get(routePath + "cache/clear/ai/keywords", validateAdminToken, (req, res) => {
    try {
      const keywords = req.query.keywords;
      if (!keywords || typeof keywords !== "string") {
        return res.status(400).json({
          error: "Keywords parameter is required and must be a string",
        });
      }

      const { removeAiCacheByKeywords } = require("../../addon");
      const result = removeAiCacheByKeywords(keywords);

      if (!result) {
        return res.status(500).json({ error: "Failed to remove cache entries" });
      }

      res.json(result);
    } catch (error) {
      logger.error("Error in cache/clear/ai/keywords endpoint:", {
        error: error.message,
        stack: error.stack,
        keywords: req.query.keywords,
      });
      res.status(500).json({
        error: "Internal server error",
        message: error.message,
      });
    }
  });

  router.get(routePath + "cache/purge/ai-empty", validateAdminToken, (req, res) => {
    try {
      const { purgeEmptyAiCacheEntries } = require("../../addon");
      const stats = purgeEmptyAiCacheEntries();
      res.json({
        message: "Purge of empty AI cache entries completed.",
        ...stats,
      });
    } catch (error) {
      logger.error("Error in cache/purge/ai-empty endpoint:", {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        error: "Internal server error",
        message: error.message,
      });
    }
  });

  router.get(routePath + "cache/clear/rpdb", validateAdminToken, (req, res) => {
    const { clearRpdbCache } = require("../../addon");
    res.json(clearRpdbCache());
  });

  router.get(routePath + "cache/clear/trakt", validateAdminToken, (req, res) => {
    const { clearTraktCache } = require("../../addon");
    res.json(clearTraktCache());
  });

  router.get(routePath + "cache/clear/trakt-raw", validateAdminToken, (req, res) => {
    const { clearTraktRawDataCache } = require("../../addon");
    res.json(clearTraktRawDataCache());
  });

  router.get(routePath + "cache/clear/query-analysis", validateAdminToken, (req, res) => {
    const { clearQueryAnalysisCache } = require("../../addon");
    res.json(clearQueryAnalysisCache());
  });

  router.get(routePath + "cache/remove/tmdb-discover", validateAdminToken, (req, res) => {
    const cacheKey = req.query.key;
    if (!cacheKey) {
      return res.status(400).json({
        error: "Cache key is required",
      });
    }

    const { removeTmdbDiscoverCacheItem } = require("../../addon");
    res.json(removeTmdbDiscoverCacheItem(cacheKey));
  });

  router.get(routePath + "cache/list/tmdb-discover", validateAdminToken, (req, res) => {
    const { listTmdbDiscoverCacheKeys } = require("../../addon");
    res.json(listTmdbDiscoverCacheKeys());
  });

  router.get(routePath + "cache/clear/all", validateAdminToken, (req, res) => {
    const {
      clearTmdbCache,
      clearTmdbDetailsCache,
      clearTmdbDiscoverCache,
      clearAiCache,
      clearRpdbCache,
      clearTraktCache,
      clearTraktRawDataCache,
      clearQueryAnalysisCache,
    } = require("../../addon");

    const tmdbResult = clearTmdbCache();
    const tmdbDetailsResult = clearTmdbDetailsCache();
    const tmdbDiscoverResult = clearTmdbDiscoverCache();
    const aiResult = clearAiCache();
    const rpdbResult = clearRpdbCache();
    const traktResult = clearTraktCache();
    const traktRawResult = clearTraktRawDataCache();
    const queryAnalysisResult = clearQueryAnalysisCache();

    res.json({
      tmdbResult,
      tmdbDetailsResult,
      tmdbDiscoverResult,
      aiResult,
      rpdbResult,
      traktResult,
      traktRawResult,
      queryAnalysisResult,
    });
  });

  router.get(routePath + "cache/save", validateAdminToken, async (req, res) => {
    const result = await saveCachesToFiles();
    res.json(result);
  });
}

module.exports = {
  registerCacheRoutes,
};
