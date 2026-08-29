import { useEffect, useMemo, useState } from "react";
import { CheckOutlined, OrderedListOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Card, Checkbox, Input, Select, Space, Table, Tag, Typography, message } from "antd";
import axios from "axios";
import { api } from "../../../lib/api";

const ALL_CLASSES_LABEL = "Toutes les classes";

interface OrderedStudentRow {
  id: string;
  key: string;
  enrollmentId?: string | null;
  schoolYearId?: string | null;
  matricule: string;
  name: string;
  className: string;
  status: "Actif" | "En attente";
  orderNumber?: number | null;
}

interface SchoolYearOption {
  id: string;
  label: string;
  isActive: boolean;
  status: "PLANIFIEE" | "EN_COURS" | "CLOTUREE" | "ARCHIVEE";
  periodItems: {
    id: string;
    name: string;
    number: number;
    isOpen: boolean;
  }[];
}

interface OrderedStudentCheckRow {
  enrollmentId: string;
  periodId: string;
  isInOrder: boolean;
}

const getApiErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError(error)) return "Chargement impossible.";
  const responseMessage = error.response?.data?.message;
  if (Array.isArray(responseMessage)) return responseMessage.join(" ");
  return typeof responseMessage === "string" ? responseMessage : "Chargement impossible.";
};

const buildDefaultInOrderMap = (rows: OrderedStudentRow[]) => {
  const defaults: Record<string, boolean> = {};
  rows.forEach((student) => {
    if (!student.enrollmentId) return;
    defaults[student.enrollmentId] = false;
  });
  return defaults;
};

export default function OrderedStudentsPage() {
  const [students, setStudents] = useState<OrderedStudentRow[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYearOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingChecks, setLoadingChecks] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState(ALL_CLASSES_LABEL);
  const [selectedPeriod, setSelectedPeriod] = useState<string>();
  const [inOrderByEnrollmentId, setInOrderByEnrollmentId] = useState<Record<string, boolean>>({});
  const [savingEnrollmentIds, setSavingEnrollmentIds] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsResponse, schoolYearsResponse] = await Promise.all([
        api.get<OrderedStudentRow[]>("/students"),
        api.get<SchoolYearOption[]>("/school-years"),
      ]);
      setStudents(studentsResponse.data);
      setSchoolYears(schoolYearsResponse.data);
      setInOrderByEnrollmentId((current) => {
        const next = buildDefaultInOrderMap(studentsResponse.data);
        Object.keys(next).forEach((enrollmentId) => {
          if (current[enrollmentId] !== undefined) {
            next[enrollmentId] = current[enrollmentId];
          }
        });
        return next;
      });
    } catch (error) {
      setStudents([]);
      setSchoolYears([]);
      setInOrderByEnrollmentId({});
      setSavingEnrollmentIds({});
      message.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const activeYear = useMemo(
    () =>
      schoolYears.find((year) => year.isActive && year.status === "EN_COURS") ??
      schoolYears.find((year) => year.isActive) ??
      null,
    [schoolYears],
  );

  const openPeriods = useMemo(
    () =>
      [...(activeYear?.periodItems ?? [])]
        .filter((period) => period.isOpen)
        .sort((a, b) => a.number - b.number),
    [activeYear],
  );

  const periodFilters = useMemo(
    () => openPeriods.map((period) => ({ value: period.id, label: period.name })),
    [openPeriods],
  );

  useEffect(() => {
    const availablePeriodIds = periodFilters.map((period) => period.value);
    if (periodFilters.length === 0) {
      if (selectedPeriod !== undefined) {
        setSelectedPeriod(undefined);
      }
      return;
    }

    if (!selectedPeriod || !availablePeriodIds.includes(selectedPeriod)) {
      setSelectedPeriod(availablePeriodIds[0]);
    }
  }, [periodFilters, selectedPeriod]);

  const scopedStudents = useMemo(
    () => (activeYear ? students.filter((student) => student.schoolYearId === activeYear.id) : []),
    [activeYear, students],
  );

  const classFilters = useMemo(
    () => [
      ALL_CLASSES_LABEL,
      ...Array.from(
        new Set(
          scopedStudents
            .map((student) => student.className)
            .filter((className) => className && className !== "—"),
        ),
      ).sort((a, b) => a.localeCompare(b, "fr", { numeric: true, sensitivity: "base" })),
    ],
    [scopedStudents],
  );

  useEffect(() => {
    const defaults = buildDefaultInOrderMap(scopedStudents);
    setInOrderByEnrollmentId((current) => {
      const next = { ...defaults };
      Object.keys(next).forEach((enrollmentId) => {
        if (current[enrollmentId] !== undefined) {
          next[enrollmentId] = current[enrollmentId];
        }
      });
      return next;
    });

    if (!selectedPeriod || scopedStudents.length === 0) return;

    let active = true;
    const loadChecks = async () => {
      setLoadingChecks(true);
      try {
        const response = await api.get<OrderedStudentCheckRow[]>(
          "/ordered-students/checks",
          { periodId: selectedPeriod },
        );
        if (!active) return;
        setInOrderByEnrollmentId(() => {
          const next = buildDefaultInOrderMap(scopedStudents);
          response.data.forEach((item) => {
            if (next[item.enrollmentId] !== undefined) {
              next[item.enrollmentId] = item.isInOrder;
            }
          });
          return next;
        });
      } catch (error) {
        if (active) {
          message.error(getApiErrorMessage(error));
        }
      } finally {
        if (active) {
          setLoadingChecks(false);
        }
      }
    };

    void loadChecks();
    return () => {
      active = false;
    };
  }, [scopedStudents, selectedPeriod]);

  const saveInOrderState = async (student: OrderedStudentRow, checked: boolean) => {
    const enrollmentId = student.enrollmentId;
    if (!enrollmentId || !selectedPeriod) return;

    const previous = Boolean(inOrderByEnrollmentId[enrollmentId]);
    setInOrderByEnrollmentId((current) => ({
      ...current,
      [enrollmentId]: checked,
    }));
    setSavingEnrollmentIds((current) => ({
      ...current,
      [enrollmentId]: true,
    }));

    try {
      await api.patch("/ordered-students/checks", {
        enrollmentId,
        periodId: selectedPeriod,
        isInOrder: checked,
      });
    } catch (error) {
      setInOrderByEnrollmentId((current) => ({
        ...current,
        [enrollmentId]: previous,
      }));
      message.error(getApiErrorMessage(error));
    } finally {
      setSavingEnrollmentIds((current) => {
        const next = { ...current };
        delete next[enrollmentId];
        return next;
      });
    }
  };

  const orderedStudents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");

    return [...scopedStudents]
      .filter((student) => {
        const matchesSearch =
          !query ||
          `${student.name} ${student.matricule} ${student.className}`
          .toLocaleLowerCase("fr")
          .includes(query);
        const matchesClass =
          selectedClass === ALL_CLASSES_LABEL || student.className === selectedClass;
        const matchesPeriod = Boolean(selectedPeriod);
        return matchesSearch && matchesClass && matchesPeriod;
      })
      .sort((a, b) => {
        const classCompare = a.className.localeCompare(b.className, "fr", {
          numeric: true,
          sensitivity: "base",
        });
        if (classCompare !== 0) return classCompare;

        const aOrder = a.orderNumber ?? Number.MAX_SAFE_INTEGER;
        const bOrder = b.orderNumber ?? Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;

        return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
      });
  }, [scopedStudents, search, selectedClass, selectedPeriod]);

  const checkedStudentsCount = useMemo(
    () =>
      orderedStudents.filter((student) =>
        Boolean(student.enrollmentId && inOrderByEnrollmentId[student.enrollmentId]),
      ).length,
    [orderedStudents, inOrderByEnrollmentId],
  );

  const handleConfirmEligibility = () => {
    if (!selectedPeriod) {
      message.warning("Selectionnez une periode ouverte avant de confirmer l eligibilite.");
      return;
    }

    if (checkedStudentsCount === 0) {
      message.warning("Cochez au moins un eleve avant de confirmer l eligibilite.");
      return;
    }

    const suffix = checkedStudentsCount > 1 ? "s" : "";
    message.success(
      `${checkedStudentsCount} eleve${suffix} confirme${suffix} pour l eligibilite.`,
    );
  };

  return (
    <section className="ordered-students-page">
      <Card
        title={
          <Space>
            <OrderedListOutlined />
            <span>Eleves en Ordre</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleConfirmEligibility}
              disabled={!selectedPeriod || checkedStudentsCount === 0 || loading || loadingChecks}
            >
              Confirmer l'eligibilite
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => void loadData()}>
              Actualiser
            </Button>
          </Space>
        }
      >
        <Typography.Paragraph type="secondary">
          Liste triee par classe, numero d ordre (si disponible), puis nom.
          Le filtre periode affiche seulement les periodes ouvertes de l annee en cours.
        </Typography.Paragraph>
        <Space wrap size={12} style={{ marginBottom: 18 }}>
          <Input.Search
            allowClear
            value={search}
            placeholder="Rechercher un eleve, un matricule ou une classe..."
            onChange={(event) => setSearch(event.target.value)}
            style={{ width: 420, maxWidth: "100%" }}
          />
          <Select
            value={selectedClass}
            onChange={setSelectedClass}
            options={classFilters.map((value) => ({ value, label: value }))}
            style={{ minWidth: 220 }}
          />
          <Select
            value={selectedPeriod}
            onChange={setSelectedPeriod}
            disabled={!activeYear || openPeriods.length === 0}
            options={periodFilters}
            placeholder="Periode ouverte"
            style={{ minWidth: 260 }}
          />
        </Space>
        {loadingChecks && (
          <Typography.Text type="secondary">Chargement des statuts en ordre...</Typography.Text>
        )}
        {!activeYear && (
          <Typography.Paragraph type="warning" style={{ marginTop: -6 }}>
            Aucune annee scolaire en cours detectee.
          </Typography.Paragraph>
        )}
        {activeYear && openPeriods.length === 0 && (
          <Typography.Paragraph type="warning" style={{ marginTop: -6 }}>
            Aucune periode ouverte pour {activeYear.label}.
          </Typography.Paragraph>
        )}

        <Table<OrderedStudentRow>
          rowKey="id"
          loading={loading || loadingChecks}
          dataSource={orderedStudents}
          pagination={false}
          scroll={{ x: 820 }}
          rowClassName={(student) =>
            student.enrollmentId && inOrderByEnrollmentId[student.enrollmentId]
              ? "ordered-students__row--checked"
              : ""
          }
          columns={[
            {
              title: "N°",
              width: 70,
              render: (_value, _student, index) => index + 1,
            },
            {
              title: "Eleve",
              dataIndex: "name",
              render: (value: string) => <span className="student-name-unified">{value}</span>,
            },
            {
              title: "Matricule",
              dataIndex: "matricule",
              render: (value: string) => (
                <code className="ordered-students__matricule student-name-unified">{value}</code>
              ),
            },
            {
              title: "Classe",
              dataIndex: "className",
              render: (value: string) => (
                <Tag className="ordered-students__class-tag student-name-unified">{value}</Tag>
              ),
            },
            {
              title: "En ordre",
              key: "in-order",
              align: "center",
              render: (_value: unknown, student: OrderedStudentRow) => (
                <span className="ordered-students__check-wrap">
                  <Checkbox
                    className="ordered-students__check"
                    checked={Boolean(student.enrollmentId && inOrderByEnrollmentId[student.enrollmentId])}
                    disabled={!selectedPeriod || !student.enrollmentId || Boolean(student.enrollmentId && savingEnrollmentIds[student.enrollmentId])}
                    onChange={(event) => {
                      void saveInOrderState(student, event.target.checked);
                    }}
                    aria-label={`Marquer ${student.name} en ordre`}
                  />
                  {Boolean(student.enrollmentId && inOrderByEnrollmentId[student.enrollmentId]) && (
                    <CheckOutlined className="ordered-students__check-sign" />
                  )}
                </span>
              ),
            },
          ]}
        />
      </Card>
    </section>
  );
}
