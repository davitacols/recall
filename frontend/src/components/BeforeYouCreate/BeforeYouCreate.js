import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import { Lozenge } from "../atlas";
import "./BeforeYouCreate.css";

/**
 * BeforeYouCreate — reusable "similar past records" side panel.
 *
 * Drives off a debounced POST to `endpoint` with { title, description, limit }
 * and renders a list of past records using the supplied `renderItem` prop.
 *
 * @param {string}   endpoint        e.g. "/api/agile/intelligence/similar-issues/"
 * @param {string}   title           current draft title (controlled)
 * @param {string}   description     current draft description (controlled)
 * @param {string}   surface         label used in headings (e.g. "issues")
 * @param {string}   heroTitle       optional panel heading override
 * @param {string}   heroSub         optional sub-heading override
 * @param {(item) => React.ReactNode} renderItem  card renderer
 * @param {(item) => string}          driftLabel  return non-empty when an item
 *                                                indicates a warning we should
 *                                                surface in the panel banner
 */
export default function BeforeYouCreate({
  endpoint,
  title,
  description,
  surface = "records",
  heroTitle = "Before you create",
  heroSub,
  renderItem,
  driftLabel,
  emptyHint = "Start typing to surface similar past " + surface + ".",
  debounceMs = 450,
  minDescriptionChars = 12,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  const fetcher = useCallback(
    async (t, d) => {
      if (!t.trim() && d.trim().length < minDescriptionChars) {
        setItems([]);
        return;
      }
      const myReq = ++requestIdRef.current;
      setLoading(true);
      try {
        const { data } = await api.post(endpoint, {
          title: t,
          description: d,
          limit: 6,
        });
        if (myReq !== requestIdRef.current) return;
        setItems(Array.isArray(data?.results) ? data.results : []);
      } catch (_) {
        if (myReq === requestIdRef.current) setItems([]);
      } finally {
        if (myReq === requestIdRef.current) setLoading(false);
      }
    },
    [endpoint, minDescriptionChars]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetcher(title, description);
    }, debounceMs);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [title, description, fetcher, debounceMs]);

  const isEmpty = !title.trim() && description.trim().length < minDescriptionChars;
  const driftSamples = (driftLabel ? items.map(driftLabel).filter(Boolean) : []);
  const driftCount = driftSamples.length;

  return (
    <div className="byc">
      <header className="byc-head">
        <div className="byc-mark">
          <SparklesIcon />
        </div>
        <div>
          <p className="byc-title">{heroTitle}</p>
          <p className="byc-sub">{heroSub || `Similar past ${surface}, surfaced as you type.`}</p>
        </div>
        {loading ? <span className="byc-spinner" /> : null}
      </header>

      {driftCount > 0 ? (
        <div className="byc-warning">
          <ExclamationTriangleIcon />
          <span>
            <strong>{driftCount}</strong> similar past {driftCount === 1 ? surface.replace(/s$/, "") : surface} {driftCount === 1 ? "has" : "have"} a signal worth reading first.
          </span>
        </div>
      ) : null}

      {isEmpty ? (
        <div className="byc-empty">
          <LightBulbIcon />
          <p>{emptyHint}</p>
        </div>
      ) : items.length === 0 && !loading ? (
        <div className="byc-empty">
          <CheckCircleIcon />
          <p>No similar past {surface} found. You're charting new ground.</p>
        </div>
      ) : (
        <ul className="byc-list">
          {items.map((item) => renderItem(item))}
        </ul>
      )}
    </div>
  );
}

