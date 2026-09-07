import {requireChatGPTUser} from "../../chatgpt-auth";
import {ContactSettings} from "../../components/ContactSettings";
export default async function Page(){await requireChatGPTUser('/mypage/contact');return <div className="ff-page"><h1 className="ff-title">문의와 수신 설정</h1><ContactSettings/></div>;}
