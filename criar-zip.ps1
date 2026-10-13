# Script PowerShell para empacotar o projeto Ateliê da Ótica
# Execute este script APÓS copiar todos os arquivos do projeto para uma pasta
# Uso: Abra o PowerShell na pasta do projeto e execute: .\criar-zip.ps1

$projectName = "Atelie_da_Otica"
$zipFileName = "$projectName.zip"
$date = Get-Date -Format "yyyyMMdd_HHmmss"
$zipFileNameWithDate = "${projectName}_${date}.zip"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Empacotando projeto: $projectName" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está na pasta correta
if (-not (Test-Path "package.json")) {
    Write-Host "ERRO: Arquivo package.json não encontrado!" -ForegroundColor Red
    Write-Host "Execute este script na raiz do projeto Ateliê da Ótica." -ForegroundColor Yellow
    exit 1
}

# Lista de pastas/arquivos para incluir
$includeItems = @(
    "src",
    "supabase",
    "tests",
    "index.html",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tsconfig.test.json",
    "vite.config.js",
    "vitest.config.ts",
    "README.md",
    "AUDIT_REPORT.md",
    "COMO_BAIXAR.md"
)

# Lista de pastas/arquivos para excluir
$excludeItems = @(
    "node_modules",
    "dist",
    ".env",
    ".env.local",
    ".git",
    "*.log"
)

Write-Host "Verificando arquivos..." -ForegroundColor Yellow

$filesToInclude = @()
foreach ($item in $includeItems) {
    if (Test-Path $item) {
        $filesToInclude += $item
        Write-Host "  [OK] $item" -ForegroundColor Green
    } else {
        Write-Host "  [!] $item (não encontrado, ignorando)" -ForegroundColor DarkYellow
    }
}

Write-Host ""
Write-Host "Criando arquivo ZIP: $zipFileNameWithDate" -ForegroundColor Yellow

# Remover ZIP anterior se existir
if (Test-Path $zipFileNameWithDate) {
    Remove-Item $zipFileNameWithDate -Force
}

# Criar ZIP
try {
    Compress-Archive -Path $filesToInclude -DestinationPath $zipFileNameWithDate -Force
    
    $zipSize = (Get-Item $zipFileNameWithDate).Length
    $zipSizeMB = [math]::Round($zipSize / 1MB, 2)
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ZIP criado com sucesso!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Arquivo: $zipFileNameWithDate" -ForegroundColor Cyan
    Write-Host "Tamanho: $zipSizeMB MB" -ForegroundColor Cyan
    Write-Host "Localização: $(Get-Location)\$zipFileNameWithDate" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Próximos passos:" -ForegroundColor Yellow
    Write-Host "  1. Extraia o ZIP em uma pasta" -ForegroundColor White
    Write-Host "  2. Abra o PowerShell na pasta extraída" -ForegroundColor White
    Write-Host "  3. Execute: npm install" -ForegroundColor White
    Write-Host "  4. Execute: npm run dev" -ForegroundColor White
    Write-Host "  5. Acesse: http://localhost:3000" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "ERRO ao criar ZIP: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternativa manual:" -ForegroundColor Yellow
    Write-Host "  1. Selecione todas as pastas e arquivos listados acima" -ForegroundColor White
    Write-Host "  2. Clique com botão direito > Enviar para > Pasta compactada" -ForegroundColor White
    Write-Host ""
    exit 1
}
