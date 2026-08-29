import { useEffect, useMemo, useState } from "react";
import {
  BookOutlined,
  CalendarOutlined,
  DatabaseOutlined,
  EyeOutlined,
  FileDoneOutlined,
  SearchOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Card,
  Drawer,
  Empty,
  Input,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { api } from "../../../lib/api";

const { Title, Text } = Typography;

type ArchiveYear = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  students: number;
  courses: number;
  homerooms: number;
  periods: number;
};

type ArchiveClass = {
  id: string;
  name: string;
  students: number;
};

type ArchivePeriod = {
  id: string;
  name: string;
  number: number;
};

type ArchiveCourse = {
  id: string;
  name: string;
  weight: number;
  teacherName: string;
};

type ArchiveStudent = {
  enrollmentId: string;
  orderNumber: number | null;
  matricule: string;
  name: string;
  className: string;
  photo?: string | null;
  totalObtained: number;
  totalWeight: number;
  percentage: number;
  rank: number | null;
  conduite: string | null;
  application: string | null;
};

type ArchiveGrade = {
  enrollmentId: string;
  courseClassId: string;
  value: number;
};

type AcademicLibraryResponse = {
  summary: {
    archivedYears: number;
    students: number;
    classes: number;
    bulletins: number;
  };
  selectedYearId: string | null;
  selectedClassId: string | null;
  selectedPeriodId: string | null;
  years: ArchiveYear[];
  classes: ArchiveClass[];
  periods: ArchivePeriod[];
  courses: ArchiveCourse[];
  students: ArchiveStudent[];
  grades: ArchiveGrade[];
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const formatScore = (value: number) =>
  Number.isInteger(value) ? value.toString() : value.toFixed(2);

export default function AcademicLibraryPage() {
  const [data, setData] = useState<AcademicLibraryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [yearId, setYearId] = useState<string>();
  const [classId, setClassId] = useState<string>();
  const [periodId, setPeriodId] = useState<string>();
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] =
    useState<ArchiveStudent | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get<AcademicLibraryResponse>(
        "/academic-library",
        {
          params: {
            yearId,
            classId,
            periodId,
            search: search || undefined,
          },
        },
      );
      setData(response.data);
      setYearId(response.data.selectedYearId ?? undefined);
      setClassId(response.data.selectedClassId ?? undefined);
      setPeriodId(response.data.selectedPeriodId ?? undefined);
    } catch {
      message.error("Impossible de charger la bibliothèque académique.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timeout);
  }, [yearId, classId, periodId, search]);

  const gradeMap = useMemo(() => {
    const map = new Map<string, number>();
    data?.grades.forEach((grade) => {
      map.set(`${grade.enrollmentId}:${grade.courseClassId}`, grade.value);
    });
    return map;
  }, [data?.grades]);

  const selectedYear = data?.years.find((year) => year.id === yearId);
  const selectedClass = data?.classes.find((schoolClass) => schoolClass.id === classId);
  const selectedPeriod = data?.periods.find((period) => period.id === periodId);

  const columns: ColumnsType<ArchiveStudent> = [
    {
      title: "N°",
      width: 58,
      render: (_, student, index) => student.orderNumber ?? index + 1,
    },
    {
      title: "Élève",
      key: "student",
      render: (_, student) => (
        <Space>
          <Avatar src={student.photo || undefined} icon={!student.photo ? <UserOutlined /> : undefined} />
          <span className="academic-library__student-name">
            <strong className="student-name-unified">{student.name}</strong>
            <small>{student.matricule}</small>
          </span>
        </Space>
      ),
    },
    {
      title: "Total",
      key: "total",
      align: "right",
      render: (_, student) => (
        <strong>
          {formatScore(student.totalObtained)} / {formatScore(student.totalWeight)}
        </strong>
      ),
    },
    {
      title: "%",
      dataIndex: "percentage",
      align: "right",
      render: (value: number) => (
        <Tag color={value >= 50 ? "green" : "red"}>{value.toFixed(2)}%</Tag>
      ),
    },
    {
      title: "Place",
      dataIndex: "rank",
      align: "center",
      render: (value: number | null) => value ? `${value}e` : "—",
    },
    {
      title: "Conduite",
      dataIndex: "conduite",
      render: (value: string | null) => value ?? "—",
    },
    {
      title: "Application",
      dataIndex: "application",
      render: (value: string | null) => value ?? "—",
    },
    {
      title: "",
      width: 78,
      align: "right",
      render: (_, student) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => setSelectedStudent(student)}
        >
          Voir
        </Button>
      ),
    },
  ];

  const detailRows =
    selectedStudent && data
      ? data.courses.map((course) => ({
          key: course.id,
          course: course.name,
          teacher: course.teacherName,
          points:
            gradeMap.get(`${selectedStudent.enrollmentId}:${course.id}`) ?? 0,
          weight: course.weight,
        }))
      : [];

  return (
    <section className="academic-library">
      <header className="academic-library__hero">
        <div className="academic-library__hero-icon">
          <DatabaseOutlined />
        </div>
        <div>
          <span>Histoire de l’école</span>
          <Title level={1}>Bibliothèque académique</Title>
          <Text>
            Consultez les années archivées, les classes, les cotes et les bulletins
            sans modifier l’historique.
          </Text>
        </div>
      </header>

      <div className="academic-library__stats">
        <Card>
          <Statistic
            title="Années archivées"
            value={data?.summary.archivedYears ?? 0}
            prefix={<DatabaseOutlined />}
          />
        </Card>
        <Card>
          <Statistic
            title="Élèves dans l’année"
            value={data?.summary.students ?? 0}
            prefix={<TeamOutlined />}
          />
        </Card>
        <Card>
          <Statistic
            title="Classes"
            value={data?.summary.classes ?? 0}
            prefix={<BookOutlined />}
          />
        </Card>
        <Card>
          <Statistic
            title="Bulletins disponibles"
            value={data?.summary.bulletins ?? 0}
            prefix={<FileDoneOutlined />}
          />
        </Card>
      </div>

      <Card className="academic-library__panel">
        <div className="academic-library__toolbar">
          <Select
            placeholder="Année archivée"
            value={yearId}
            loading={loading}
            onChange={(value) => {
              setYearId(value);
              setClassId(undefined);
              setPeriodId(undefined);
            }}
            options={data?.years.map((year) => ({
              value: year.id,
              label: `${year.label} · ${formatDate(year.startDate)}-${formatDate(year.endDate)}`,
            }))}
          />
          <Select
            placeholder="Classe"
            value={classId}
            loading={loading}
            onChange={setClassId}
            options={data?.classes.map((schoolClass) => ({
              value: schoolClass.id,
              label: `${schoolClass.name} · ${schoolClass.students} élève${schoolClass.students > 1 ? "s" : ""}`,
            }))}
          />
          <Select
            placeholder="Période"
            value={periodId}
            loading={loading}
            onChange={setPeriodId}
            options={data?.periods.map((period) => ({
              value: period.id,
              label: period.name,
            }))}
          />
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Rechercher un élève ou matricule"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {!loading && data?.years.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Aucune année archivée pour le moment."
          />
        ) : (
          <>
            <div className="academic-library__context">
              <span>
                <CalendarOutlined /> {selectedYear?.label ?? "Année archivée"}
              </span>
              <span>
                <BookOutlined /> {selectedClass?.name ?? "Classe"}
              </span>
              <span>
                <TrophyOutlined /> {selectedPeriod?.name ?? "Période"}
              </span>
            </div>
            <Table
              rowKey="enrollmentId"
              columns={columns}
              dataSource={data?.students ?? []}
              loading={loading}
              pagination={false}
              scroll={{ x: 980 }}
            />
          </>
        )}
      </Card>

      <Drawer
        title={selectedStudent ? selectedStudent.name : "Détail historique"}
        open={Boolean(selectedStudent)}
        onClose={() => setSelectedStudent(null)}
        width={760}
        className="academic-library__drawer"
      >
        {selectedStudent ? (
          <>
            <div className="academic-library__student-card">
              <Avatar
                size={58}
                src={selectedStudent.photo || undefined}
                icon={!selectedStudent.photo ? <UserOutlined /> : undefined}
              />
              <div>
                <strong className="student-name-unified">{selectedStudent.name}</strong>
                <span>
                  {selectedStudent.matricule} · {selectedStudent.className} ·{" "}
                  {selectedPeriod?.name}
                </span>
              </div>
              <Tag color={selectedStudent.percentage >= 50 ? "green" : "red"}>
                {selectedStudent.percentage.toFixed(2)}%
              </Tag>
            </div>

            <div className="academic-library__student-summary">
              <Card>
                <small>Total général</small>
                <strong>
                  {formatScore(selectedStudent.totalObtained)} /{" "}
                  {formatScore(selectedStudent.totalWeight)}
                </strong>
              </Card>
              <Card>
                <small>Place</small>
                <strong>{selectedStudent.rank ? `${selectedStudent.rank}e` : "—"}</strong>
              </Card>
              <Card>
                <small>Conduite</small>
                <strong>{selectedStudent.conduite ?? "—"}</strong>
              </Card>
              <Card>
                <small>Application</small>
                <strong>{selectedStudent.application ?? "—"}</strong>
              </Card>
            </div>

            <Table
              rowKey="key"
              pagination={false}
              dataSource={detailRows}
              columns={[
                { title: "Cours", dataIndex: "course" },
                { title: "Professeur", dataIndex: "teacher" },
                {
                  title: "Points",
                  dataIndex: "points",
                  align: "right",
                  render: (value: number, row) => (
                    <Tag color={value >= row.weight / 2 ? "green" : "red"}>
                      {formatScore(value)}
                    </Tag>
                  ),
                },
                {
                  title: "Pondération",
                  dataIndex: "weight",
                  align: "right",
                  render: (value: number) => formatScore(value),
                },
              ]}
            />
          </>
        ) : null}
      </Drawer>
    </section>
  );
}
