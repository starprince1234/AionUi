/**
 * Create-task wizard router page (`/evidossier/new/:kind`).
 *
 * The wizard shell resolves the task kind, reads the query hand-off contract used
 * by the review/comparison workbenches and delegates to the task-specific form.
 * Every successful creation ends on the new package workspace.
 */
import { Button } from '@arco-design/web-react';
import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useEvidossier } from '../../data/EvidossierProvider';
import { EmptyState, LoadingBlock, PageHeader, useEvidT } from '../../design/primitives';
import { GenerateWizardForm } from './GenerateWizardForm';
import { ReviewWizardForm } from './ReviewWizardForm';
import { CompareWizardForm } from './CompareWizardForm';
import { splitIdList } from './WizardFields';
import './createWizard.css';

const KINDS = ['generate', 'review', 'compare'] as const;
type WizardKind = (typeof KINDS)[number];

const isWizardKind = (value: string | undefined): value is WizardKind =>
  value === 'generate' || value === 'review' || value === 'compare';

const TITLE_KEYS: Record<WizardKind, string> = {
  generate: 'evidossierPackage.wizard.generate.pageTitle',
  review: 'evidossierPackage.wizard.review.pageTitle',
  compare: 'evidossierPackage.wizard.compare.pageTitle',
};

const DESCRIPTION_KEYS: Record<WizardKind, string> = {
  generate: 'evidossierPackage.wizard.generate.pageDescription',
  review: 'evidossierPackage.wizard.review.pageDescription',
  compare: 'evidossierPackage.wizard.compare.pageDescription',
};

const CreateTaskWizard: React.FC = () => {
  const t = useEvidT();
  const navigate = useNavigate();
  const { kind } = useParams<{ kind: string }>();
  const [searchParams] = useSearchParams();
  const { snapshot, loading } = useEvidossier();

  const queryProjectId = searchParams.get('projectId') ?? undefined;
  const reviewPackageId = searchParams.get('reviewPackageId') ?? undefined;
  const comparePackageId = searchParams.get('comparePackageId') ?? undefined;

  const sourceProjectId = (() => {
    if (!snapshot) return undefined;
    if (reviewPackageId) return snapshot.packages.find((pkg) => pkg.id === reviewPackageId)?.projectId;
    if (comparePackageId) return snapshot.packages.find((pkg) => pkg.id === comparePackageId)?.projectId;
    return undefined;
  })();
  const activeProjectId = sourceProjectId ?? queryProjectId ?? snapshot?.projects[0]?.id;
  const activeProject = snapshot?.projects.find((project) => project.id === activeProjectId);

  const goBack = (): void => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(activeProjectId ? `/evidossier/projects/${activeProjectId}` : '/evidossier');
  };

  if (!isWizardKind(kind)) {
    return (
      <div className='evd-pkg-wizard-page'>
        <PageHeader
          title={t('evidossierPackage.wizard.invalidKindTitle')}
          description={t('evidossierPackage.wizard.invalidKindText')}
          actions={
            <Button type='primary' onClick={() => navigate('/evidossier')}>
              {t('evidossierPackage.workspace.backToWorkspace')}
            </Button>
          }
        />
        <EmptyState
          title={t('evidossierCommon.common.notFound')}
          text={t('evidossierPackage.wizard.invalidKindText')}
          center
          actions={
            <Button onClick={() => navigate('/evidossier/new/generate')}>
              {t('evidossierCommon.action.createPackage')}
            </Button>
          }
        />
      </div>
    );
  }

  const hasProjects = (snapshot?.projects.length ?? 0) > 0;

  const renderBody = (): React.ReactNode => {
    if (loading || !snapshot) return <LoadingBlock label={t('evidossierCommon.common.loading')} />;
    if (!hasProjects) {
      return (
        <EmptyState
          title={t('evidossierPackage.wizard.noProjectsTitle')}
          text={t('evidossierPackage.wizard.noProjectsText')}
          center
          actions={
            <Button type='primary' onClick={() => navigate('/evidossier/projects')}>
              {t('evidossierPackage.wizard.goCreateProject')}
            </Button>
          }
        />
      );
    }
    if (kind === 'generate') {
      return (
        <GenerateWizardForm
          key={searchParams.toString()}
          initialProjectId={activeProjectId}
          initialMode={searchParams.get('mode') === 'revision' ? 'revision' : undefined}
          baseVersionId={searchParams.get('baseVersionId') ?? undefined}
          reviewPackageId={reviewPackageId}
          reviewVersionId={searchParams.get('reviewVersionId') ?? undefined}
          findingIds={splitIdList(searchParams.get('findingIds'))}
          comparePackageId={comparePackageId}
          compareVersionId={
            searchParams.get('compareVersionId') ?? searchParams.get('comparisonVersionId') ?? undefined
          }
          differenceIds={splitIdList(searchParams.get('differenceIds'))}
          targetVersionId={searchParams.get('targetVersionId') ?? undefined}
          baselineVersionId={searchParams.get('baselineVersionId') ?? undefined}
        />
      );
    }
    if (kind === 'review') {
      return (
        <ReviewWizardForm
          key={searchParams.toString()}
          initialProjectId={activeProjectId}
          initialTargetVersionId={searchParams.get('reviewVersionId') ?? undefined}
        />
      );
    }
    return (
      <CompareWizardForm
        key={searchParams.toString()}
        initialProjectId={activeProjectId}
        baselineVersionId={searchParams.get('baselineVersionId') ?? undefined}
        targetVersionId={searchParams.get('targetVersionId') ?? undefined}
      />
    );
  };

  return (
    <div className='evd-pkg-wizard-page'>
      <PageHeader
        crumbs={[
          { label: t('evidossierCommon.nav.home'), onClick: () => navigate('/evidossier') },
          ...(activeProject
            ? [{ label: activeProject.name, onClick: () => navigate(`/evidossier/projects/${activeProject.id}`) }]
            : []),
        ]}
        title={t(TITLE_KEYS[kind])}
        description={t(DESCRIPTION_KEYS[kind])}
        actions={<Button onClick={goBack}>{t('evidossierCommon.action.cancel')}</Button>}
      />
      {renderBody()}
    </div>
  );
};

export default CreateTaskWizard;
