import type { PropRow } from '../app/lib/docs';
import styles from './PropsTable.module.css';

interface PropsTableProps {
  rows: PropRow[];
}

export function PropsTable({ rows }: PropsTableProps) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Required</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.name}>
              <td className={styles.name}>{row.name}</td>
              <td className={styles.type}>{row.type}</td>
              <td className={styles.required}>{row.required ? 'Yes' : 'No'}</td>
              <td className={styles.defaultVal}>{row.default ?? '\u2014'}</td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
