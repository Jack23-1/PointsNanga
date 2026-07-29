import { Avatar, Button, Card, Progress, Tag } from "antd";
import {
  BookOutlined,
  DownloadOutlined,
  RiseOutlined,
  TrophyOutlined,
} from "@ant-design/icons";

const grades: {
  subject: string;
  grade: number;
  average: number;
  rank: string;
  progress: number;
  color: string;
}[] = [];

const StudentDashboard = () => (
  <main className="student-dashboard">
    <section className="student-hero">
      <div className="student-hero__copy">
        <span className="student-hero__eyebrow">Espace élève</span>
        <h1>Bonjour 👋</h1>
        <p>Les résultats réels apparaîtront après publication depuis la base.</p>
      </div>
      <div className="student-hero__profile">
        <Avatar size={56} className="student-hero__avatar">PN</Avatar>
        <div>
          <strong>Élève connecté</strong>
          <span>Données issues de la base</span>
        </div>
      </div>
      <div className="student-hero__orb" />
    </section>

    <section className="student-stats" aria-label="Résumé des résultats">
      <article className="student-stat-card student-stat-card--primary">
        <span className="student-stat-card__icon"><TrophyOutlined /></span>
        <div><span>Moyenne générale</span><strong>0<small>/20</small></strong></div>
        <Tag>Non publié</Tag>
      </article>
      <article className="student-stat-card">
        <span className="student-stat-card__icon student-stat-card__icon--violet"><BookOutlined /></span>
        <div><span>Matières validées</span><strong>0</strong></div>
        <p>Aucune donnée publiée</p>
      </article>
      <article className="student-stat-card">
        <span className="student-stat-card__icon student-stat-card__icon--green"><RiseOutlined /></span>
        <div><span>Rang de classe</span><strong>—</strong></div>
        <p>En attente de calcul</p>
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
        <div className="student-results-card__footer"><span>Aucun résultat publié pour le moment.</span><Tag>Base réelle</Tag></div>
      </Card>

      <aside className="student-dashboard__aside">
        <Card className="student-card student-ranking-card" bordered={false}>
          <span className="student-card__eyebrow">Positionnement</span>
          <h2>Classement</h2>
          <div className="student-ranking-card__score"><strong>—</strong><span>en attente</span></div>
          <Progress type="circle" percent={0} size={126} strokeColor="#2563eb" format={() => "—"} />
          <p>Le classement sera calculé depuis les résultats publiés.</p>
        </Card>
        <Card className="student-card student-school-card" bordered={false}>
          <span className="student-card__eyebrow">Établissement</span>
          <h3>Établissement</h3>
          <p>Données de l’élève connecté</p>
          <div><span>Statut des résultats</span><Tag>Non publié</Tag></div>
        </Card>
      </aside>
    </section>
  </main>
);

export default StudentDashboard;
