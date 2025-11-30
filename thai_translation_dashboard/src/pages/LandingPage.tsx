import {
  FileSpreadsheet,
  Globe,
  Hash,
  Languages,
  Sparkles,
  Wrench,
} from 'lucide-react';
import type React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { __ } from '@/utils/translation';

const LandingPage: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-120px)] p-4">
      <div className="max-w-5xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-10 h-10 text-primary animate-pulse" />
            <h1 className="text-4xl font-bold tracking-tight">
              {__('Translation Tools')}
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {__('Select the translation tool you want to use')}
          </p>
        </div>

        {/* Tool Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          {/* ASEAN Translations Card */}
          <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 group">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <Globe className="w-12 h-12 text-primary group-hover:scale-110 transition-transform" />
                <Languages className="w-8 h-8 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">ASEAN Translations</CardTitle>
              <CardDescription className="text-base">
                {__('Translation for ASEAN Countries')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col justify-between space-y-4 h-full">
              <p className="text-sm text-muted-foreground">
                {__(
                  'Automatic translation system for Frappe/ERPNext and Custom Apps. Supports multiple ASEAN languages with AI and Glossary Management'
                )}
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>{__('Automatic .po file translation with AI')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>{__('Glossary and technical term management')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>{__('Supports Thai, Vietnamese, Malay, etc.')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>{__('Sync with GitHub Repository')}</span>
                </li>
              </ul>
              <Link to="/asean-translations" className="block mt-6">
                <Button
                  className="w-full text-base h-12"
                  size="lg"
                  variant={'outline'}
                >
                  {__('Enter ASEAN Translations')}
                  <Globe className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* CSV Translations Card */}
          <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 group">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <FileSpreadsheet className="w-12 h-12 text-primary group-hover:scale-110 transition-transform" />
                <Languages className="w-8 h-8 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">CSV Translations</CardTitle>
              <CardDescription className="text-base">
                {__('Automatic CSV file translation')}
              </CardDescription>
            </CardHeader>
            <CardContent
              id="csv__translation__card__content"
              className="flex flex-col justify-between space-y-4 h-full"
            >
              <p className="text-sm text-muted-foreground">
                {__(
                  'Translation system specifically for CSV files. Perfect for batch processing of large amounts of data'
                )}
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">✓</span>
                  <span>
                    {__('Upload CSV file and translate automatically')}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">✓</span>
                  <span>{__('Select columns to translate')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">✓</span>
                  <span>{__('Download results as CSV')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">✓</span>
                  <span>{__('Supports large files')}</span>
                </li>
              </ul>
              <Link to="/csv-translations" className="block mt-6">
                <Button
                  className="w-full text-base h-12"
                  size="lg"
                  variant="outline"
                >
                  {__('Enter CSV Translations')}
                  <FileSpreadsheet className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* UUID Generator Card */}
          <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 group">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <Hash className="w-12 h-12 text-primary group-hover:scale-110 transition-transform" />
                <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">UUID Generator</CardTitle>
              <CardDescription className="text-base">
                {__('Generate unique identifiers for data')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col justify-between space-y-4 h-full">
              <p className="text-sm text-muted-foreground">
                {__(
                  'Generate 10-character alphanumeric UUIDs for Asset Categories and other purposes with CSV automation support'
                )}
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">✓</span>
                  <span>{__('Single UUID generation')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">✓</span>
                  <span>{__('Bulk UUID generation (up to 1000)')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">✓</span>
                  <span>{__('CSV automation with column merge')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">✓</span>
                  <span>{__('Download as TXT or CSV')}</span>
                </li>
              </ul>
              <Link to="/uuid-generator" className="block mt-6">
                <Button
                  className="w-full text-base h-12"
                  size="lg"
                  variant="secondary"
                >
                  {__('Enter UUID Generator')}
                  <Hash className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Account Mapper Card */}
          <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 group">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <Wrench className="w-12 h-12 text-orange-500 group-hover:scale-110 transition-transform" />
                <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">Account Mapper</CardTitle>
              <CardDescription className="text-base">
                {__('Fix Frappe Data Export/Import bugs')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col justify-between space-y-4 h-full">
              <p className="text-sm text-muted-foreground">
                {__(
                  'Fix Account CSV export/import issues when migrating Chart of Accounts between companies or servers'
                )}
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500">✓</span>
                  <span>{__('Remove extra quotes from Data Export')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500">✓</span>
                  <span>{__('Override company abbreviation (ABBR)')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500">✓</span>
                  <span>{__('Override company name')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500">✓</span>
                  <span>{__('Fix Parent Account references')}</span>
                </li>
              </ul>
              <Link to="/account-mapper" className="block mt-6">
                <Button
                  className="w-full text-base h-12"
                  size="lg"
                  variant="outline"
                >
                  {__('Enter Account Mapper')}
                  <Wrench className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Footer Info */}
        <div className="text-center text-sm text-muted-foreground mt-8 p-4 bg-muted/30 rounded-lg">
          <p>
            💡 <strong>{__('Tip:')}</strong>{' '}
            {__(
              'You can navigate between all tools anytime via the left sidebar'
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
