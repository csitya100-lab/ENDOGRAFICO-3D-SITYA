import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { loadCaseFromDb, CaseData, isSupabaseConfigured } from '@/lib/caseDb';
import { useLesionStore } from '@/lib/lesionStore';
import { Uterus3D } from '@/components/Uterus3D';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, User, AlertCircle, Loader2 } from 'lucide-react';

import { MousePointer2, Plus } from 'lucide-react';

export default function CaseViewer() {
  const { caseId } = useParams<{ caseId: string }>();
  const [, setLocation] = useLocation();
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = useState<'add' | 'edit'>('add');
  const [selectedLesionId, setSelectedLesionId] = useState<string | null>(null);
  const { setLesions, clearLesions } = useLesionStore();

  useEffect(() => {
    clearLesions();

    if (!caseId) {
      setError('ID do caso não fornecido');
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      setError('Supabase não está configurado');
      setLoading(false);
      return;
    }

    loadCaseFromDb(caseId)
      .then((data) => {
        if (data) {
          setCaseData(data);
          setLesions(data.lesions || []);
        } else {
          setError('Caso não encontrado');
        }
      })
      .catch((err) => {
        setError(err.message || 'Erro ao carregar caso');
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      clearLesions();
    };
  }, [caseId, setLesions, clearLesions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>Carregando caso...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              Erro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">{error}</p>
            <Button onClick={() => setLocation('/')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Button
            onClick={() => setLocation('/')}
            variant="ghost"
            className="text-white hover:bg-white/10"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          {caseData && (
            <div className="flex items-center gap-4">
              <div className="flex bg-gray-800/80 rounded-lg p-1 border border-gray-700">
                <Button
                  size="sm"
                  variant={interactionMode === 'add' ? 'default' : 'ghost'}
                  className={`h-8 px-3 text-xs gap-1.5 ${interactionMode === 'add' ? 'bg-pink-600 hover:bg-pink-700' : 'text-gray-400'}`}
                  onClick={() => setInteractionMode('add')}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar
                </Button>
                <Button
                  size="sm"
                  variant={interactionMode === 'edit' ? 'default' : 'ghost'}
                  className={`h-8 px-3 text-xs gap-1.5 ${interactionMode === 'edit' ? 'bg-cyan-600 hover:bg-cyan-700' : 'text-gray-400'}`}
                  onClick={() => setInteractionMode('edit')}
                >
                  <MousePointer2 className="w-3.5 h-3.5" />
                  Editar
                </Button>
              </div>

              <div className="flex items-center gap-6 text-white/80 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span data-testid="text-patient-name">{caseData.patient_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span data-testid="text-exam-date">{caseData.exam_date}</span>
                </div>
                <div className="px-3 py-1 bg-pink-500/20 rounded-full text-pink-300">
                  {caseData.lesions?.length || 0} lesões
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="h-screen pt-16">
        <Uterus3D
          readOnly={false}
          selectedLesionId={selectedLesionId}
          onSelectLesion={setSelectedLesionId}
        />
      </div>
    </div>
  );
}
