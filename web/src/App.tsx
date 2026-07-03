import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Jobs from "@/pages/Jobs";
import JobDetail from "@/pages/JobDetail";
import AdminLogin from "@/pages/admin/Login";
import AdminLayout from "@/components/AdminLayout";
import Dashboard from "@/pages/admin/Dashboard";
import JobList from "@/pages/admin/JobList";
import JobForm from "@/pages/admin/JobForm";
import Applications from "@/pages/admin/Applications";
import ApplicationDetail from "@/pages/admin/ApplicationDetail";
import CandidateTimeSelect from "@/pages/CandidateTimeSelect";

function About() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16">
        <div className="bg-hero border-b border-white/5">
          <div className="container mx-auto px-4 py-12">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">关于五新重工</h1>
            <p className="text-gray-400">了解我们</p>
          </div>
        </div>
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <p className="text-gray-600 leading-relaxed">五新重工集团有限公司是中国重型装备制造行业的领军企业。</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/interview/time-select/:applicationId" element={<CandidateTimeSelect />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="jobs" element={<JobList />} />
          <Route path="jobs/new" element={<JobForm />} />
          <Route path="jobs/:id/edit" element={<JobForm />} />
          <Route path="applications" element={<Applications />} />
          <Route path="applications/:id" element={<ApplicationDetail />} />
        </Route>
      </Routes>
    </Router>
  );
}
