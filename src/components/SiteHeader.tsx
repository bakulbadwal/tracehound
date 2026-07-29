export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="wordmark">
          <div className="wordmark-glyph">TH</div>
          <div>
            <div className="wordmark-text">TraceHound</div>
            <div className="wordmark-tag">Digital forensics case desk</div>
          </div>
        </div>
        <div className="header-context" aria-label="Workspace capabilities">
          <span className="header-status"><span className="status-dot" />Public-chain evidence workspace</span>
          <span className="header-chains">ETH · BNB · POLYGON · ARBITRUM</span>
        </div>
      </div>
    </header>
  );
}
