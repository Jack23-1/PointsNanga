import { Avatar, Button, Card, Progress, Tag } from "antd";
import {
  BookOutlined,
  DownloadOutlined,
  RiseOutlined,
  TrophyOutlined,
} from "@ant-design/icons";

const grades = [
  { subject: "Mathématiques", grade: 14, average: 12.5, rank: "5e / 45", progress: 70, color: "#2563eb" },
  { subject: "Français", grade: 16, average: 13.2, rank: "3e / 45", progress: 80, color: "#7c3aed" },
  { subject: "Physique", grade: 12, average: 11.8, rank: "12e / 45", progress: 60, color: "#0891b2" },
  { subject: "Anglais", grade: 15, average: 13.5, rank: "4e / 45", progress: 75, color: "#059669" },
];

const StudentDashboard = () => (
  <main className="student-dashboard">
    <section className="student-hero">
      <div className="student-hero__copy">
        <span className="student-hero__eyebrow">Année scolaire 2025–2026</span>
        <h1>Bonjour, Jean 👋</h1>
        <p>Voici un aperçu de tes résultats pour le premier trimestre.</p>
      </div>
      <div className="student-hero__profile">
        <Avatar size={56} className="student-hero__avatar">JM</Avatar>
        <div>
          <strong>Jean Mukendi</strong>
          <span>6ème A · ELV20260001</span>
        </div>
      </div>
      <div className="student-hero__orb" />
    </section>

    <section className="student-stats" aria-label="Résumé des résultats">
      <article className="student-stat-card student-stat-card--primary">
        <span className="student-stat-card__icon"><TrophyOutlined /></span>
        <div><span>Moyenne générale</span><strong>14,2<small>/20</small></strong></div>
        <Tag color="success">Très bien</Tag>
      </article>
      <article className="student-stat-card">
        <span className="student-stat-card__icon student-stat-card__icon--violet"><BookOutlined /></span>
        <div><span>Matières validées</span><strong>4<small>/5</small></strong></div>
        <p>80% des matières</p>
      </article>
      <article className="student-stat-card">
        <span className="student-stat-card__icon student-stat-card__icon--green"><RiseOutlined /></span>
        <div><span>Rang de classe</span><strong>4<small>e / 45</small></strong></div>
        <p>Top 10% de la classe</p>
      </article>
    </section>

    <section className="student-dashboard__grid">
      <Card className="student-card student-results-card" bordered={false}>
        <div className="student-card__heading">
          <div><span className="student-card__eyebrow">Premier trimestre</span><h2>Mes résultats</h2></div>
          <Button type="primary" icon={<DownloadOutlined />} className="student-download">Bulletin</Button>
        </div>
        <div className="student-results-list">
          {grades.map((grade) => (
            <article className="student-result" key={grade.subject}>
              <div className="student-result__subject"><span className="student-result__dot" style={{ background: grade.color }} />{grade.subject}</div>
              <div className="student-result__progress"><Progress percent={grade.progress} showInfo={false} strokeColor={grade.color} trailColor="#eef2f7" /></div>
              <div className="student-result__score"><strong>{grade.grade}<small>/20</small></strong><span>Moy. {grade.average}</span></div>
              <div className="student-result__rank">{grade.rank}</div>
            </article>
          ))}
        </div>
        <div className="student-results-card__footer"><span>Une matière reste en attente de publication.</span><Tag color="warning">En attente</Tag></div>
      </Card>

      <aside className="student-dashboard__aside">
        <Card className="student-card student-ranking-card" bordered={false}>
          <span className="student-card__eyebrow">Positionnement</span>
          <h2>Une belle progression</h2>
          <div className="student-ranking-card__score"><strong>4<sup>e</sup></strong><span>sur 45 élèves</span></div>
          <Progress type="circle" percent={91} size={126} strokeColor="#2563eb" format={() => "Top 10%"} />
          <p>Tu es au-dessus de la moyenne de ta classe. Continue ainsi !</p>
        </Card>
        <Card className="student-card student-school-card" bordered={false}>
          <span className="student-card__eyebrow">Établissement</span>
          <h3>Lycée Saint-Michel</h3>
          <p>Kinshasa · Classe de 6ème A</p>
          <div><span>Statut des résultats</span><Tag color="success">Publié</Tag></div>
        </Card>
      </aside>
    </section>
  </main>
);

export default StudentDashboard;
