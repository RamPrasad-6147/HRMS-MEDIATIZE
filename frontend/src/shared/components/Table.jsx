import React from "react";
import Button from "./Button";

export function Table({ columns = [], data = [], keyField = "id", loading = false, emptyText = "No records found" }) {
  if (loading) {
    return (
      <div className="hrms-table-container" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
        Loading table data...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="hrms-table-container" style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
        {emptyText}
      </div>
    );
  }

  return (
    <div className="hrms-table-container">
      <table className="hrms-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={col.key || idx} style={col.headerStyle}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row[keyField]}>
              {columns.map((col, idx) => (
                <td key={col.key || idx} style={col.cellStyle}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page = 1, totalPages = 1, total = 0, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div style={styles.paginationContainer}>
      <span style={styles.pageInfo}>
        Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total)
      </span>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          &larr; Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next &rarr;
        </Button>
      </div>
    </div>
  );
}

const styles = {
  paginationContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.875rem 1.25rem",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    borderTop: "none",
    borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
  },
  pageInfo: {
    fontSize: "0.8125rem",
    color: "var(--text-secondary)",
  },
};
