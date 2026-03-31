import styles from '../app/page.module.css';

interface FeatureCardProps {
  title: string;
  description: string;
  videoSrc: string;
  tag: string;
  tagColor: 'blue' | 'green' | 'purple' | 'orange';
  wide?: boolean;
}

const TAG_CLASS: Record<string, string> = {
  blue: styles.tagBlue,
  green: styles.tagGreen,
  purple: styles.tagPurple,
  orange: styles.tagOrange,
};

export default function FeatureCard({
  title,
  description,
  videoSrc,
  tag,
  tagColor,
  wide,
}: FeatureCardProps) {
  return (
    <div className={`${styles.featureCard}${wide ? ` ${styles.wide}` : ''}`}>
      <video className={styles.featureVideo} src={videoSrc} autoPlay loop muted playsInline />
      <div className={styles.featureBody}>
        <span className={`${styles.tag} ${TAG_CLASS[tagColor]}`}>{tag}</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}
