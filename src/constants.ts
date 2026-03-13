import { ModuleType, Channel } from './types';
import { 
  Headphones, 
  Mic, 
  BookOpen, 
  PenTool, 
  Languages, 
  FileText,
  LayoutDashboard
} from 'lucide-react';

export const CHANNELS: Channel[] = [
  {
    channel_id: "A",
    channel_name_cn: "核心通用高频",
    channel_name_en: "Core Essentials",
    parent_id: null,
    target_words: 3200,
    description: "雅思G类考试最底层的高频词基石，涵盖生存与交流的核心词汇。",
    recommended_order: 1
  },
  {
    channel_id: "A1",
    channel_name_cn: "高频核心词",
    channel_name_en: "High-Freq Core",
    parent_id: "A",
    target_words: 1500,
    description: "最基础且出现频率最高的词汇，是所有考生的提分基石。",
    recommended_order: 2
  },
  {
    channel_id: "A2",
    channel_name_cn: "功能词 & 高频搭配",
    channel_name_en: "Functional & Collocations",
    parent_id: "A",
    target_words: 1100,
    description: "掌握常用的逻辑连接词与地道搭配，提升表达的连贯性与准确度。",
    recommended_order: 3
  },
  {
    channel_id: "A3",
    channel_name_cn: "口语表达块",
    channel_name_en: "Spoken Chunks",
    parent_id: "A",
    target_words: 600,
    description: "聚焦口语考试中的地道表达块，帮助考生在Part 1和Part 2中流利输出。",
    recommended_order: 14
  },
  {
    channel_id: "B",
    channel_name_cn: "雅思通用书面/学术表达",
    channel_name_en: "Academic & Written",
    parent_id: null,
    target_words: 2000,
    description: "提升语域档次，适用于阅读理解与Task 2高分写作。",
    recommended_order: 15
  },
  {
    channel_id: "B1",
    channel_name_cn: "论证与逻辑连接体系",
    channel_name_en: "Argument & Logic",
    parent_id: "B",
    target_words: 500,
    description: "写作中不可或缺的逻辑衔接词，增强论证的严密性。",
    recommended_order: 16
  },
  {
    channel_id: "B2",
    channel_name_cn: "学术词族 & 同义替换",
    channel_name_en: "Academic Family & Synonyms",
    parent_id: "B",
    target_words: 900,
    description: "涵盖学术环境下的核心词族及同义替换，提升阅读理解与写作多样性。",
    recommended_order: 17
  },
  {
    channel_id: "B3",
    channel_name_cn: "语域升级与书面搭配",
    channel_name_en: "Formal Register & Collocations",
    parent_id: "B",
    target_words: 600,
    description: "优化书面语域，掌握地道的学术搭配，使表达更具专业感。",
    recommended_order: 18
  },
  {
    channel_id: "C",
    channel_name_cn: "G类高频场景词汇",
    channel_name_en: "G-Class Scenarios",
    parent_id: null,
    target_words: 1700,
    description: "针对G类特有的生活与职场场景，解决实际应用中的词汇缺口。",
    recommended_order: 4
  },
  {
    channel_id: "C1",
    channel_name_cn: "住宿与社区",
    channel_name_en: "Housing & Community",
    parent_id: "C",
    target_words: 280,
    description: "涵盖租房、社区设施及邻里互动相关的实用表达。",
    recommended_order: 5
  },
  {
    channel_id: "C2",
    channel_name_cn: "工作与职场",
    channel_name_en: "Work & Career",
    parent_id: "C",
    target_words: 280,
    description: "聚焦简历投递、面试及日常办公环境下的职场词汇。",
    recommended_order: 6
  },
  {
    channel_id: "C3",
    channel_name_cn: "教育与培训",
    channel_name_en: "Education & Training",
    parent_id: "C",
    target_words: 220,
    description: "涉及成人教育、职业培训及技能提升相关的场景词汇。",
    recommended_order: 7
  },
  {
    channel_id: "C4",
    channel_name_cn: "医疗与健康",
    channel_name_en: "Health & Medical",
    parent_id: "C",
    target_words: 220,
    description: "掌握预约医生、描述症状及健康管理相关的地道表达。",
    recommended_order: 8
  },
  {
    channel_id: "C5",
    channel_name_cn: "交通与出行",
    channel_name_en: "Travel & Transport",
    parent_id: "C",
    target_words: 180,
    description: "涵盖公共交通、自驾及旅行计划相关的出行词汇。",
    recommended_order: 9
  },
  {
    channel_id: "C6",
    channel_name_cn: "购物与服务",
    channel_name_en: "Shopping & Services",
    parent_id: "C",
    target_words: 180,
    description: "涉及退换货、咨询服务及日常消费相关的场景词。",
    recommended_order: 10
  },
  {
    channel_id: "C7",
    channel_name_cn: "银行与财务",
    channel_name_en: "Banking & Finance",
    parent_id: "C",
    target_words: 170,
    description: "聚焦银行开户、转账及个人理财相关的财务词汇。",
    recommended_order: 11
  },
  {
    channel_id: "C8",
    channel_name_cn: "政府与公共服务",
    channel_name_en: "Gov & Public Services",
    parent_id: "C",
    target_words: 170,
    description: "涉及市政服务、法律咨询及公共事务相关的实用词汇。",
    recommended_order: 12
  },
  {
    channel_id: "D",
    channel_name_cn: "写作 Task 1 功能词",
    channel_name_en: "Writing Task 1",
    parent_id: null,
    target_words: 700,
    description: "专门针对G类书信写作的结构与功能表达。",
    recommended_order: 13
  },
  {
    channel_id: "D1",
    channel_name_cn: "结构与语气框架",
    channel_name_en: "Structure & Tone",
    parent_id: "D",
    target_words: 220,
    description: "掌握各类书信的标准结构与语气转换。",
    recommended_order: 14
  },
  {
    channel_id: "D2",
    channel_name_cn: "功能动作词库",
    channel_name_en: "Functional Actions",
    parent_id: "D",
    target_words: 330,
    description: "聚焦书信中描述动作、请求及解释原因的核心动词库。",
    recommended_order: 15
  },
  {
    channel_id: "D3",
    channel_name_cn: "书信高频固定表达块",
    channel_name_en: "Letter Fixed Phrases",
    parent_id: "D",
    target_words: 150,
    description: "积累书信开头、结尾及过渡段的高频固定表达。",
    recommended_order: 16
  },
  {
    channel_id: "E",
    channel_name_cn: "写作 Task 2 主题与表达",
    channel_name_en: "Writing Task 2",
    parent_id: null,
    target_words: 400,
    description: "针对议论文写作的高频主题与逻辑评价词汇。",
    recommended_order: 19
  },
  {
    channel_id: "E1",
    channel_name_cn: "高频社会议题主题词",
    channel_name_en: "Social Issues",
    parent_id: "E",
    target_words: 220,
    description: "针对环境、科技、教育等议论文高频社会议题的主题词库。",
    recommended_order: 20
  },
  {
    channel_id: "E2",
    channel_name_cn: "观点表达与评价词",
    channel_name_en: "Opinions & Evaluation",
    parent_id: "E",
    target_words: 120,
    description: "掌握表达观点、赞成/反对及评价事物影响的精准词汇。",
    recommended_order: 21
  },
  {
    channel_id: "E3",
    channel_name_cn: "影响/原因/趋势描述词",
    channel_name_en: "Impact & Trends",
    parent_id: "E",
    target_words: 60,
    description: "聚焦描述社会趋势、因果关系及潜在影响的逻辑词汇。",
    recommended_order: 22
  }
];

export const MODULES: { id: ModuleType; label: string; icon: any; description: string }[] = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: LayoutDashboard, 
    description: 'Track your overall progress and detailed channel metrics.' 
  },
  { 
    id: 'listening', 
    label: 'Listening', 
    icon: Headphones, 
    description: 'Practice your ear with audio materials and exercises.' 
  },
  { 
    id: 'speaking', 
    label: 'Speaking', 
    icon: Mic, 
    description: 'Record and review your pronunciation and fluency.' 
  },
  { 
    id: 'reading', 
    label: 'Reading', 
    icon: BookOpen, 
    description: 'Improve comprehension with articles and documents.' 
  },
  { 
    id: 'writing', 
    label: 'Writing', 
    icon: PenTool, 
    description: 'Draft essays and practice your written expression.' 
  },
  { 
    id: 'vocabulary', 
    label: 'Vocabulary', 
    icon: Languages, 
    description: 'Master new words with flashcards and tracking.' 
  },
  { 
    id: 'grammar', 
    label: 'Grammar', 
    icon: FileText, 
    description: 'Study rules and refine your sentence structures.' 
  },
];
