
import { useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const parseKoreanDate = (text) => {
  if (!text) return null;
  const match = text.match(/(\d{2})월(\d{2})일/);
  if (!match) return null;
  const [_, mm, dd] = match;
  const yyyy = new Date().getFullYear();
  return `${yyyy}-${mm}-${dd}`;
};

const DownloadButton = ({ data }) => {
  const handleDownload = () => {
    if (!data || data.length === 0) {
      alert("다운로드할 데이터가 없습니다.");
      return;
    }

    const downloadData = data.map((row, index) => ({
      번호: index + 1,
      날짜: row.sale_date,
      상품명: row.customer_item,
      금액: row.customer_amount,
      전화번호1: row.customer_phone1,
      전화번호2: row.customer_phone2,
      우편번호: row.customer_zip_code,
      주소: row.customer_address,
      받는분: row.customer_name,
      비고: row.etc,
      보내는분: row.send_company,
      보내는분_전화번호: row.send_phone,
      보내는분_주소: row.send_address,
    }));

    const worksheet = XLSX.utils.json_to_sheet(downloadData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "백세산삼");
    XLSX.writeFile(workbook, `택배사_${dayjs().format("YYYY-MM-DD")}.xlsx`);
  };

  return (
    <button
      onClick={handleDownload}
      className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded"
    >
      엑셀 다운로드
    </button>
  );
};

export default function UploadPage() {
  const today = dayjs().format("YYYY-MM-DD");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [tableData, setTableData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 10;

  const handleButtonClick = (type) => {
    setSourceType(type);
    setMessage("");
    document.getElementById("excel-input")?.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !sourceType) return;

    setLoading(true);
    setMessage("");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const result = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        let saleData;

        if (sourceType === "택배사") {
          if (!row[1]) continue;
          saleData = {
            sale_date: parseKoreanDate(row[1]),
            customer_item: row[2] || "",
            customer_amount: Number(row[3]) || 0,
            customer_phone1: row[4] || "",
            customer_phone2: row[5] || "",
            customer_zip_code: row[6] || "",
            customer_address: row[7] || "",
            customer_name: row[8] || "",
            etc: row[9] || "",
            send_company: row[10] || "",
            send_phone: row[11] || "",
            send_address: row[12] || "",
            customer_flg: row[13] || "",
          };
        } else if (sourceType === "네이버") {
          if (!row[0]) continue;
          saleData = {
            sale_date: dayjs(row[0]).format("YYYY-MM-DD"),
            customer_item: row[1] || "",
            customer_amount: Number(row[2]) || 0,
            customer_phone1: row[3] || "",
            customer_phone2: "",
            customer_zip_code: "",
            customer_address: row[4] || "",
            customer_name: row[5] || "",
            etc: row[6] || "",
            send_company: "네이버",
            send_phone: "",
            send_address: "",
            customer_flg: "",
          };
        } else if (sourceType === "당근") {
          if (!row[1]) continue;
          saleData = {
            sale_date: parseKoreanDate(row[1]),
            customer_item: row[2] || "",
            customer_amount: Number(row[3]) || 0,
            customer_phone1: row[4] || "",
            customer_phone2: "",
            customer_zip_code: "",
            customer_address: row[5] || "",
            customer_name: row[6] || "",
            etc: row[7] || "",
            send_company: "당근",
            send_phone: "",
            send_address: "",
            customer_flg: "",
          };
        } else if (sourceType === "카페24") {
          if (!row[2]) continue;
          saleData = {
            sale_date: dayjs(row[2]).format("YYYY-MM-DD"),
            customer_item: row[3] || "",
            customer_amount: Number(row[4]) || 0,
            customer_phone1: row[5] || "",
            customer_phone2: "",
            customer_zip_code: row[6] || "",
            customer_address: row[7] || "",
            customer_name: row[8] || "",
            etc: row[9] || "",
            send_company: "카페24",
            send_phone: "",
            send_address: "",
            customer_flg: "",
          };
        }

        if (saleData) result.push(saleData);
      }

      const { error } = await supabase.from("customer_sales").insert(result);
      if (error) throw error;

      setMessage(`✅ ${result.length}건 ${sourceType} 업로드 완료`);
    } catch (err) {
      console.error(err);
      setMessage(`❌ ${sourceType} 업로드 중 오류 발생`);
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setMessage("");
    setTableData([]);
    setCurrentPage(1);

    try {
      const { data, error } = await supabase
        .from("customer_sales")
        .select("*")
        .gte("sale_date", fromDate)
        .lte("sale_date", toDate)
        .order("sale_date", { ascending: true });

      if (error) throw error;

      setTableData(data);
    } catch (err) {
      console.error(err);
      setMessage("❌ 조회 중 오류 발생");
    } finally {
      setLoading(false);
    }
  };

  // 페이지 단위로 나눠 보여줄 데이터
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = tableData.slice(startIndex, startIndex + rowsPerPage);
  const totalPages = Math.ceil(tableData.length / rowsPerPage);

  return (
    <div className="max-w-6xl mx-auto mt-10 p-4 border rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">엑셀 자료 업로드/다운로드</h1>

      <h2 className="text-lg font-semibold mb-2">[업로드]</h2>
      <div className="flex gap-4 flex-wrap mb-6">
        {["택배사", "네이버", "당근", "카페24"].map((type) => (
          <button
            key={type}
            onClick={() => handleButtonClick(type)}
            className="bg-green-500 text-white px-8 py-4 text-xl font-bold rounded-xl shadow-md hover:bg-green-600 transition"
          >
            {type} UPLOAD
          </button>
        ))}
      </div>

      <input
        id="excel-input"
        type="file"
        accept=".xlsx, .xls"
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />

      <h2 className="text-lg font-semibold mb-2">[조회 및 다운로드]</h2>
      <div className="flex gap-4 items-center mb-6">
        <label>
          From:{" "}
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </label>
        <label>
          To:{" "}
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </label>
        <button
          onClick={handleSearch}
          className="bg-green-500 text-white px-8 py-4 text-xl font-bold rounded-xl shadow-md hover:bg-green-600 transition"
        >
          조회
        </button>

        <DownloadButton data={tableData} />
      </div>

      {loading && <p className="text-blue-500">⏳ 처리 중...</p>}
      {message && <p className="mt-2">{message}</p>}

      {paginatedData.length > 0 && (
        <div className="overflow-auto mt-4">
          <table className="min-w-full border border-collapse">
            <thead>
              <tr>
                {[
                  "번호",
                  "날짜",
                  "상품명",
                  "금액",
                  "전화번호1",
                  "전화번호2",
                  "우편번호",
                  "주소",
                  "받는분",
                  "비고",
                  "보내는분",
                  "보내는분 전화",
                  "보내는분 주소",
                  "구분",
                ].map((col) => (
                  <th key={col} className="border px-2 py-1 bg-gray-100 text-sm">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, index) => (
                <tr key={index} className="text-sm">
                  <td className="border px-2 py-1">
                    {startIndex + index + 1}
                  </td>
                  <td className="border px-2 py-1">{row.sale_date}</td>
                  <td className="border px-2 py-1">{row.customer_item}</td>
                  <td className="border px-2 py-1">{row.customer_amount}</td>
                  <td className="border px-2 py-1">{row.customer_phone1}</td>
                  <td className="border px-2 py-1">{row.customer_phone2}</td>
                  <td className="border px-2 py-1">{row.customer_zip_code}</td>
                  <td className="border px-2 py-1">{row.customer_address}</td>
                  <td className="border px-2 py-1">{row.customer_name}</td>
                  <td className="border px-2 py-1">{row.etc}</td>
                  <td className="border px-2 py-1">{row.send_company}</td>
                  <td className="border px-2 py-1">{row.send_phone}</td>
                  <td className="border px-2 py-1">{row.send_address}</td>
                  <td className="border px-2 py-1">{row.customer_flg}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-center items-center gap-4 mt-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="bg-gray-300 px-3 py-1 rounded disabled:opacity-50"
            >
              이전
            </button>
            <span>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="bg-gray-300 px-3 py-1 rounded disabled:opacity-50"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}