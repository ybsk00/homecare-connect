'use client';

import { useState, useEffect } from 'react';
import AdminTopBar from '@/components/layout/AdminTopBar';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { formatDate } from '@homecare/shared-utils';
import { Upload, BookOpen, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

interface RagDocument {
  id: string;
  title: string;
  source: string;
  content: string;
  chunk_index: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface DocumentGroup {
  title: string;
  source: string;
  chunks: RagDocument[];
  is_active: boolean;
  created_at: string;
}

export default function RagPage() {
  const [documentGroups, setDocumentGroups] = useState<DocumentGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSource, setUploadSource] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('rag_documents')
        .select('*')
        .order('title', { ascending: true })
        .order('chunk_index', { ascending: true });

      if (error) throw error;

      const groups: Map<string, DocumentGroup> = new Map();
      ((data as RagDocument[]) || []).forEach((doc) => {
        const key = `${doc.title}::${doc.source}`;
        if (!groups.has(key)) {
          groups.set(key, {
            title: doc.title,
            source: doc.source,
            chunks: [],
            is_active: doc.is_active,
            created_at: doc.created_at,
          });
        }
        groups.get(key)!.chunks.push(doc);
      });

      setDocumentGroups(Array.from(groups.values()));
    } catch (err) {
      console.error('RAG 문서 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(group: DocumentGroup) {
    try {
      const supabase = createBrowserSupabaseClient();
      const newActive = !group.is_active;

      const chunkIds = group.chunks.map((c) => c.id);
      const { error } = await supabase
        .from('rag_documents')
        .update({ is_active: newActive })
        .in('id', chunkIds);

      if (error) throw error;
      fetchDocuments();
    } catch (err) {
      console.error('문서 상태 변경 실패:', err);
    }
  }

  async function handleDelete(group: DocumentGroup) {
    if (!confirm(`"${group.title}" 문서를 삭제하시겠습니까? (${group.chunks.length}개 청크)`)) {
      return;
    }
    try {
      const supabase = createBrowserSupabaseClient();
      const chunkIds = group.chunks.map((c) => c.id);
      const { error } = await supabase
        .from('rag_documents')
        .delete()
        .in('id', chunkIds);

      if (error) throw error;
      fetchDocuments();
    } catch (err) {
      console.error('문서 삭제 실패:', err);
    }
  }

  async function handleUpload() {
    if (!uploadTitle || !uploadSource || !uploadContent) return;
    setUploading(true);
    try {
      const supabase = createBrowserSupabaseClient();

      const chunkSize = 1000;
      const overlap = 100;
      const chunks: string[] = [];
      let start = 0;

      while (start < uploadContent.length) {
        const end = Math.min(start + chunkSize, uploadContent.length);
        chunks.push(uploadContent.slice(start, end));
        start = end - overlap;
        if (start >= uploadContent.length - overlap) break;
      }

      const records = chunks.map((chunk, idx) => ({
        title: uploadTitle,
        source: uploadSource,
        content: chunk,
        chunk_index: idx,
        is_active: true,
        metadata: { total_chunks: chunks.length, uploaded_by: 'admin' },
      }));

      const { error } = await supabase.from('rag_documents').insert(records);
      if (error) throw error;

      setUploadTitle('');
      setUploadSource('');
      setUploadContent('');
      setShowUploadForm(false);
      fetchDocuments();
    } catch (err) {
      console.error('문서 업로드 실패:', err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <AdminTopBar title="RAG KB 관리" subtitle="보호자 챗봇에서 활용되는 지식베이스를 관리합니다." />
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-primary-400">
              RAG (Retrieval-Augmented Generation) 지식베이스를 관리합니다.
            </p>
          </div>
          <Button onClick={() => setShowUploadForm(!showUploadForm)}>
            <Upload className="w-4 h-4 mr-1.5" />
            문서 업로드
          </Button>
        </div>

        {/* Upload Form */}
        {showUploadForm && (
          <Card>
            <h3 className="text-[15px] font-bold text-primary-900 mb-6">문서 업로드</h3>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <Input
                  label="문서 제목"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="예: 장기요양보험 가이드"
                />
                <Input
                  label="출처"
                  value={uploadSource}
                  onChange={(e) => setUploadSource(e.target.value)}
                  placeholder="예: 국민건강보험공단"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-primary-600 mb-2">
                  문서 내용
                </label>
                <textarea
                  value={uploadContent}
                  onChange={(e) => setUploadContent(e.target.value)}
                  placeholder="문서 전문을 붙여넣기 하세요. 자동으로 청킹됩니다."
                  rows={10}
                  className="w-full rounded-xl bg-primary-50/60 px-4 py-3 text-sm text-primary-800 placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-secondary-500/30 transition-all"
                />
                <p className="mt-2 text-[12px] text-primary-300">
                  {uploadContent.length.toLocaleString()}자 | 예상 청크 수:{' '}
                  {uploadContent.length > 0 ? Math.ceil(uploadContent.length / 900) : 0}개
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  loading={uploading}
                  onClick={handleUpload}
                  disabled={!uploadTitle || !uploadSource || !uploadContent}
                >
                  업로드
                </Button>
                <Button variant="ghost" onClick={() => setShowUploadForm(false)}>
                  취소
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Document Cards Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-[3px] border-primary-100 border-t-secondary-600 rounded-full animate-spin" />
          </div>
        ) : documentGroups.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-16 text-primary-200">
              <BookOpen className="w-14 h-14 mb-4" />
              <p className="text-sm text-primary-300">등록된 문서가 없습니다.</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documentGroups.map((group) => (
              <Card key={`${group.title}::${group.source}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 bg-primary-100 rounded-xl">
                    <BookOpen className="w-5 h-5 text-primary-600" />
                  </div>
                  <Badge color={group.is_active ? 'green' : 'gray'}>
                    {group.is_active ? '활성' : '비활성'}
                  </Badge>
                </div>
                <h4 className="text-[15px] font-bold text-primary-800 mb-1 line-clamp-1">
                  {group.title}
                </h4>
                <p className="text-[12px] text-primary-400 mb-4">{group.source}</p>
                <div className="flex items-center gap-3 mb-5">
                  <Badge color="teal">{group.chunks.length}개 청크</Badge>
                  <span className="text-[11px] text-primary-300">{formatDate(group.created_at)}</span>
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <button
                    onClick={() => handleToggleActive(group)}
                    className="p-2 rounded-xl hover:bg-primary-50 transition-all"
                    title={group.is_active ? '비활성화' : '활성화'}
                  >
                    {group.is_active ? (
                      <ToggleRight className="w-5 h-5 text-secondary-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-primary-300" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(group)}
                    className="p-2 rounded-xl hover:bg-danger-50 transition-all"
                    title="삭제"
                  >
                    <Trash2 className="w-5 h-5 text-danger-500" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
