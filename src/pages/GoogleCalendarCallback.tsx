/**
 * Google Calendar Callback — Legacy redirect handler
 *
 * The new GIS Token Model flow does NOT use this page.
 * This exists only to gracefully handle stale bookmarks or direct navigation.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const GoogleCalendarCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Immediately redirect to Study OS calendar section
    navigate("/study?section=calendar", { replace: true });
  }, [navigate]);

  return null;
};

export default GoogleCalendarCallback;
