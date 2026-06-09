/**
 * Vercel Speed Insights - Static Site Implementation
 * Initializes Speed Insights using the official @vercel/speed-insights package via CDN
 */

// Import and initialize Speed Insights
import { injectSpeedInsights } from 'https://cdn.jsdelivr.net/npm/@vercel/speed-insights@1/+esm';

// Initialize Speed Insights with automatic route detection
injectSpeedInsights({
  // Automatically detect route from current page
  route: window.location.pathname,
  // Enable debug mode in development (set to false in production)
  debug: false,
  // Use default Vercel Speed Insights script path
  // This will automatically work when deployed on Vercel
});
