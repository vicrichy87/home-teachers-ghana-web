// components/Banner.js
import Image from "next/image";
import logo from "../public/logo.png";

export default function Banner({ small = false }) {
  return (
    <div className={`flex items-center ${small ? "space-x-2" : "flex-col space-y-2"}`}>
      <div style={{ width: small ? 48 : 120, height: small ? 48 : 120 }}>
        <Image src={logo} alt="Home Teachers Ghana" style={{ objectFit: "contain" }} />
      </div>
      {!small && (
        <div className="text-center">
          <h1 className="text-3xl font-bold text-emerald-800">Home Teachers Ghana</h1>
          <p className="text-slate-600">Connect local tutors with learners — simple, safe, trusted</p>
        </div>
      )}
    </div>
  );
}
