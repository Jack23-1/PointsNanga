import { useMemo, useState } from "react";
import { FileExcelOutlined, InboxOutlined } from "@ant-design/icons";
import { Alert, Modal, Select, Space, Table, Tag, Upload, message } from "antd";
import { readSheet } from "read-excel-file/browser";
import axios from "axios";
import { api } from "../../../lib/api";

type Cell = string | number | boolean | Date | null;

interface ImportRow {
  key: string;
  lastName: string;
  postName: string;
  firstName: string;
  gender?: "Fille" | "Garçon";
  birthDate?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  errors: string[];
}

interface Props {
  open: boolean;
  classes: { id: string; label: string; isActive: boolean }[];
  schoolYears: { id: string; label: string; isActive: boolean; status: string }[];
  onClose: () => void;
  onImported: () => Promise<void> | void;
}

const normalizeHeader = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]/g, "");

const aliases: Record<Exclude<keyof ImportRow, "key" | "errors">, string[]> = {
  lastName: ["nom", "lastname", "nomdefamille"],
  postName: ["postnom", "middlename", "deuxiemenom"],
  firstName: ["prenom", "firstname"],
  gender: ["sexe", "genre", "gender"],
  birthDate: ["datedenaissance", "naissance", "birthdate", "datenaissance"],
  address: ["adresse", "address", "domicile"],
  guardianName: ["nomtuteur", "tuteur", "responsable", "guardianname"],
  guardianPhone: ["telephone", "telephoneparent", "telephonetuteur", "contact", "phone"],
};

const parseCsv = (text: string): Cell[][] => {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      row.push(cell.trim()); cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = "";
    } else cell += character;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
};

const formatDate = (value: Cell) => {
  if (!value) return undefined;
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return Number.isNaN(date.valueOf()) ? undefined : date.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  const french = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  const normalized = french ? `${french[3]}-${french[2].padStart(2, "0")}-${french[1].padStart(2, "0")}` : text;
  const date = new Date(normalized);
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString().slice(0, 10);
};

const mapRows = (matrix: Cell[][]): ImportRow[] => {
  if (matrix.length < 2) throw new Error("Le fichier doit contenir une ligne d’en-têtes et au moins un élève.");
  const headers = matrix[0].map(normalizeHeader);
  const indexes = Object.fromEntries(
    Object.entries(aliases).map(([field, names]) => [field, headers.findIndex((header) => names.includes(header))]),
  ) as Record<Exclude<keyof ImportRow, "key" | "errors">, number>;
  if (indexes.lastName < 0 || indexes.firstName < 0) {
    throw new Error("Les colonnes « Nom » et « Prénom » sont obligatoires.");
  }
  const seen = new Set<string>();
  return matrix.slice(1).filter((row) => row.some((cell) => String(cell ?? "").trim())).map((row, index) => {
    const value = (field: keyof typeof indexes) => indexes[field] >= 0 ? String(row[indexes[field]] ?? "").trim() : "";
    const genderValue = value("gender").toLocaleLowerCase("fr");
    const gender = ["f", "fille", "femme", "feminin", "féminin"].includes(genderValue)
      ? "Fille" as const
      : ["m", "garcon", "garçon", "homme", "masculin"].includes(genderValue)
        ? "Garçon" as const
        : undefined;
    const birthDateCell = indexes.birthDate >= 0 ? row[indexes.birthDate] : null;
    const birthDate = formatDate(birthDateCell);
    const errors: string[] = [];
    const lastName = value("lastName");
    const postName = value("postName");
    const firstName = value("firstName");
    if (!lastName) errors.push("Nom manquant");
    if (!firstName) errors.push("Prénom manquant");
    if (birthDateCell && !birthDate) errors.push("Date invalide");
    if (value("gender") && !gender) errors.push("Sexe invalide");
    const identity = `${lastName}|${postName}|${firstName}|${birthDate ?? ""}`.toLocaleUpperCase("fr");
    if (seen.has(identity)) errors.push("Doublon dans le fichier");
    seen.add(identity);
    return {
      key: String(index + 2), lastName, postName, firstName, gender, birthDate,
      address: value("address") || undefined,
      guardianName: value("guardianName") || undefined,
      guardianPhone: value("guardianPhone") || undefined,
      errors,
    };
  });
};

const apiError = (error: unknown) => {
  if (!axios.isAxiosError(error)) return error instanceof Error ? error.message : "Importation impossible.";
  const value = error.response?.data?.message;
  return Array.isArray(value) ? value.join(" ") : typeof value === "string" ? value : "Importation impossible.";
};

export default function StudentImportModal({ open, classes, schoolYears, onClose, onImported }: Props) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [classId, setClassId] = useState<string>();
  const [schoolYearId, setSchoolYearId] = useState<string>();
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const validRows = useMemo(() => rows.filter((row) => !row.errors.length), [rows]);

  const reset = () => { setRows([]); setFileName(""); setClassId(undefined); setSchoolYearId(undefined); };
  const close = () => { if (!importing) { reset(); onClose(); } };

  const readFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { message.error("Le fichier ne doit pas dépasser 5 Mo."); return false; }
    setParsing(true);
    try {
      const extension = file.name.split(".").pop()?.toLocaleLowerCase();
      const matrix = extension === "csv" ? parseCsv(await file.text()) : await readSheet(file) as Cell[][];
      const mapped = mapRows(matrix);
      if (mapped.length > 1000) throw new Error("Un import est limité à 1 000 élèves.");
      setRows(mapped); setFileName(file.name);
      message.success(`${mapped.length} ligne${mapped.length > 1 ? "s analysées" : " analysée"}.`);
    } catch (error) { setRows([]); message.error(apiError(error)); }
    finally { setParsing(false); }
    return false;
  };

  const submit = async () => {
    if (!classId || !schoolYearId) { message.error("Sélectionnez l’année scolaire et la classe."); return; }
    if (!validRows.length) { message.error("Aucune ligne valide à importer."); return; }
    setImporting(true);
    try {
      const response = await api.post<{
        total: number; imported: number; rejected: { row: number; reason: string }[];
      }>("/students/import", {
        students: validRows.map(({ key: _key, errors: _errors, ...student }) => ({
          ...student, classId: Number(classId), schoolYearId: Number(schoolYearId),
        })),
      });
      await onImported();
      const rejected = response.data.rejected;
      Modal[rejected.length ? "warning" : "success"]({
        centered: true,
        title: `${response.data.imported} élève${response.data.imported > 1 ? "s importés" : " importé"}`,
        content: rejected.length
          ? <div><p>{rejected.length} ligne(s) ignorée(s) :</p>{rejected.slice(0, 12).map((item) => <p key={`${item.row}-${item.reason}`}>Ligne {item.row} : {item.reason}</p>)}</div>
          : "Toutes les lignes valides ont été enregistrées avec leurs matricules.",
      });
      reset(); onClose();
    } catch (error) { message.error(apiError(error)); }
    finally { setImporting(false); }
  };

  return (
    <Modal open={open} onCancel={close} width={980} title={<Space><FileExcelOutlined /><strong>Importer des élèves</strong></Space>} okText={`Importer ${validRows.length || ""} élève${validRows.length > 1 ? "s" : ""}`} onOk={submit} confirmLoading={importing} okButtonProps={{ disabled: !validRows.length || !classId || !schoolYearId }} cancelText="Annuler">
      <Alert showIcon type="info" message="Formats acceptés : Excel (.xlsx) et CSV (.csv)" description="En-têtes reconnus : Nom, Postnom, Prénom, Sexe, Date de naissance, Adresse, Nom tuteur et Téléphone." style={{ marginBottom: 16 }} />
      <Space wrap style={{ marginBottom: 16 }}>
        <Select placeholder="Année scolaire active" value={schoolYearId} onChange={setSchoolYearId} style={{ width: 230 }} options={schoolYears.map((year) => ({ value: year.id, label: year.label, disabled: !year.isActive }))} />
        <Select placeholder="Classe de destination" value={classId} onChange={setClassId} style={{ width: 230 }} options={classes.filter((item) => item.isActive).map((item) => ({ value: item.id, label: item.label }))} />
      </Space>
      <Upload.Dragger accept=".xlsx,.csv" maxCount={1} showUploadList={false} beforeUpload={readFile} disabled={parsing || importing}>
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">Déposez le fichier ici ou cliquez pour le choisir</p>
        <p className="ant-upload-hint">{fileName || "Maximum 5 Mo et 1 000 élèves"}</p>
      </Upload.Dragger>
      {rows.length > 0 && <Table rowKey="key" size="small" style={{ marginTop: 18 }} dataSource={rows.slice(0, 100)} pagination={false} scroll={{ y: 340 }} columns={[
        { title: "Ligne", dataIndex: "key", width: 70 },
        { title: "Nom", dataIndex: "lastName" },
        { title: "Postnom", dataIndex: "postName" },
        { title: "Prénom", dataIndex: "firstName" },
        { title: "Sexe", dataIndex: "gender", render: (value) => value || "—" },
        { title: "Naissance", dataIndex: "birthDate", render: (value) => value || "—" },
        { title: "Contrôle", render: (_, row) => row.errors.length ? <Tag color="red">{row.errors.join(" · ")}</Tag> : <Tag color="green">Valide</Tag> },
      ]} />}
      {rows.length > 100 && <Alert type="warning" showIcon message="L’aperçu affiche les 100 premières lignes ; toutes les lignes valides seront importées." style={{ marginTop: 12 }} />}
    </Modal>
  );
}
