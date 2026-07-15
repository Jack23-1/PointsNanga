import { useState } from "react";
import {
  BookOutlined,
  CheckCircleFilled,
  HeartOutlined,
  HomeOutlined,
  IdcardOutlined,
  LeftOutlined,
  PhoneOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Alert, Avatar, Button, Card, Col, Form, Input, Row, Select, Steps, Tag, Typography, message } from "antd";
import type { Student, StudentFormData } from "../../../types";
import logo from "../../../assets/logo.png";

const { Title, Text } = Typography;

type EnrollmentFormData = StudentFormData & {
  enrollmentDate: string;
  emergencyContact?: string;
  healthNotes?: string;
};

const stepFields: (Array<keyof EnrollmentFormData>)[] = [
  ["firstName", "lastName", "dateOfBirth", "gender"],
  ["schoolId", "classId", "enrollmentDate"],
  ["parentPhone", "parentEmail", "address"],
];

const StudentsPage = () => {
  const [form] = Form.useForm<EnrollmentFormData>();
  const [currentStep, setCurrentStep] = useState(0);
  const [formValues, setFormValues] = useState<Partial<EnrollmentFormData>>({});
  const [recentStudents, setRecentStudents] = useState<Student[]>([]);

  const nextStep = async () => {
    try {
      await form.validateFields(stepFields[currentStep]);
      setCurrentStep((step) => step + 1);
    } catch {
      // Ant Design highlights the fields that need attention.
    }
  };

  const createStudent = async () => {
    try {
      const values = await form.validateFields();
      const now = new Date().toISOString();
      const student: Student = {
        ...values,
        id: `student-${Date.now()}`,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      setRecentStudents((students) => [student, ...students]);
      form.resetFields();
      setFormValues({});
      setCurrentStep(0);
      message.success(`${student.firstName} ${student.lastName} a été inscrit(e) avec succès.`);
    } catch {
      // Ant Design shows field-level validation feedback.
    }
  };

  const displayName = [formValues.firstName, formValues.lastName].filter(Boolean).join(" ") || "Nouvel élève";

  return (
    <section className="student-enrollment">
      <header className="student-enrollment__hero">
        <div>
          <span className="student-enrollment__eyebrow">Administration de l'établissement</span>
          <Title level={1}>Inscrire un élève</Title>
          <Text>Un parcours guidé en trois étapes pour créer un dossier scolaire complet.</Text>
        </div>
        <div className="student-enrollment__hero-brand">
          <div className="student-enrollment__hero-logo"><img src={logo} alt="Logo Points Nanga" /></div>
          <div className="student-enrollment__hero-icon"><IdcardOutlined /></div>
        </div>
      </header>

      <div className="student-enrollment__layout">
        <Card className="student-enrollment__form-card" bordered={false}>
          <Steps current={currentStep} responsive={false} items={[{ title: "Identité", icon: <UserOutlined /> }, { title: "Scolarité", icon: <BookOutlined /> }, { title: "Tuteur", icon: <SafetyCertificateOutlined /> }]} />

          <Form
            form={form}
            layout="vertical"
            className="student-enrollment__form"
            initialValues={{ gender: "male", schoolId: "school-1", enrollmentDate: new Date().toISOString().slice(0, 10) }}
            onValuesChange={(_, allValues) => setFormValues(allValues)}
          >
            {currentStep === 0 && <section className="student-enrollment__step">
              <div className="student-enrollment__step-heading"><span className="student-enrollment__step-icon"><UserOutlined /></span><div><h2>Identité de l'élève</h2><p>Les informations figurant sur les documents scolaires.</p></div></div>
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12}><Form.Item label="Prénom" name="firstName" rules={[{ required: true, message: "Le prénom est requis." }]}><Input placeholder="Ex. Grâce" /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Nom" name="lastName" rules={[{ required: true, message: "Le nom est requis." }]}><Input placeholder="Ex. Kalonji" /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Date de naissance" name="dateOfBirth" rules={[{ required: true, message: "La date de naissance est requise." }]}><Input type="date" /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Genre" name="gender" rules={[{ required: true, message: "Le genre est requis." }]}><Select options={[{ value: "male", label: "Garçon" }, { value: "female", label: "Fille" }]} /></Form.Item></Col>
              </Row>
            </section>}

            {currentStep === 1 && <section className="student-enrollment__step">
              <div className="student-enrollment__step-heading"><span className="student-enrollment__step-icon student-enrollment__step-icon--blue"><BookOutlined /></span><div><h2>Parcours scolaire</h2><p>Choisissez l'établissement, la classe et la date d'inscription.</p></div></div>
              <Form.Item label="École" name="schoolId" rules={[{ required: true, message: "L'école est requise." }]}><Select options={[{ value: "school-1", label: "Lycée Saint-Michel" }, { value: "school-2", label: "Collège Notre-Dame" }, { value: "school-3", label: "Institut Technique Matadi" }]} /></Form.Item>
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12}><Form.Item label="Classe" name="classId" rules={[{ required: true, message: "La classe est requise." }]}><Select placeholder="Sélectionner une classe" options={["6ème A", "6ème B", "5ème A", "5ème B"].map((value) => ({ value, label: value }))} /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Date d'inscription" name="enrollmentDate" rules={[{ required: true, message: "La date d'inscription est requise." }]}><Input type="date" /></Form.Item></Col>
              </Row>
              <Alert type="info" showIcon message="Un matricule unique sera généré automatiquement après l'inscription." />
            </section>}

            {currentStep === 2 && <section className="student-enrollment__step">
              <div className="student-enrollment__step-heading"><span className="student-enrollment__step-icon student-enrollment__step-icon--green"><PhoneOutlined /></span><div><h2>Parent ou tuteur</h2><p>Ces données permettent de garder le contact avec la famille.</p></div></div>
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12}><Form.Item label="Téléphone du tuteur" name="parentPhone" rules={[{ required: true, message: "Le téléphone est requis." }]}><Input placeholder="+243 810 000 000" /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="E-mail du tuteur" name="parentEmail" rules={[{ required: true, type: "email", message: "Saisissez un e-mail valide." }]}><Input placeholder="parent@email.com" /></Form.Item></Col>
              </Row>
              <Form.Item label="Adresse de résidence" name="address" rules={[{ required: true, message: "L'adresse est requise." }]}><Input prefix={<HomeOutlined />} placeholder="Quartier, commune, ville" /></Form.Item>
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12}><Form.Item label="Contact d'urgence (facultatif)" name="emergencyContact"><Input placeholder="Nom et téléphone" /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Information médicale (facultatif)" name="healthNotes"><Input prefix={<HeartOutlined />} placeholder="Allergie, traitement…" /></Form.Item></Col>
              </Row>
            </section>}
          </Form>

          <div className="student-enrollment__actions">
            {currentStep > 0 ? <Button icon={<LeftOutlined />} onClick={() => setCurrentStep((step) => step - 1)}>Retour</Button> : <span />}
            {currentStep < 2 ? <Button type="primary" icon={<RightOutlined />} iconPosition="end" onClick={nextStep}>Continuer</Button> : <Button type="primary" icon={<CheckCircleFilled />} onClick={createStudent}>Créer le dossier élève</Button>}
          </div>
        </Card>

        <aside className="student-enrollment__aside">
          <Card className="student-enrollment__preview" bordered={false}>
            <span className="student-enrollment__preview-label">Aperçu du dossier</span>
            <Avatar size={74} icon={<UserOutlined />} className="student-enrollment__avatar" />
            <h2>{displayName}</h2>
            <p>{formValues.classId || "Classe à sélectionner"}</p>
            <div className="student-enrollment__preview-details">
              <div><span>École</span><strong>{formValues.schoolId === "school-1" ? "Lycée Saint-Michel" : formValues.schoolId || "À sélectionner"}</strong></div>
              <div><span>Contact tuteur</span><strong>{formValues.parentPhone || "À compléter"}</strong></div>
            </div>
            <Tag color="processing">Dossier en préparation</Tag>
          </Card>
          <Card className="student-enrollment__tip" bordered={false}><CheckCircleFilled /><div><strong>Inscription guidée</strong><span>Les champs facultatifs peuvent être complétés plus tard depuis le dossier élève.</span></div></Card>
        </aside>
      </div>

      {recentStudents.length > 0 && <Card className="student-enrollment__recent" title="Élèves récemment inscrits" bordered={false}>
        {recentStudents.map((student) => <div key={student.id}><Avatar icon={<UserOutlined />} /><span><strong>{student.firstName} {student.lastName}</strong><Text type="secondary">{student.classId} · {student.schoolId}</Text></span><Tag color="success">Actif</Tag></div>)}
      </Card>}
    </section>
  );
};

export default StudentsPage;
