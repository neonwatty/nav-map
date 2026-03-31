import styles from './CodeBlock.module.css';

interface CodeBlockProps {
  code: string;
}

export function CodeBlock({ code }: CodeBlockProps) {
  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <div className={styles.dot} />
        <div className={styles.dot} />
        <div className={styles.dot} />
      </div>
      <pre className={styles.codeBody}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
