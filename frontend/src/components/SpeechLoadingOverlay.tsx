import React from 'react';

interface SpeechLoadingOverlayProps {
  isVisible: boolean;
  text?: string;
  statusText?: string;
}

export const SpeechLoadingOverlay: React.FC<SpeechLoadingOverlayProps> = ({ 
  isVisible, 
  text = "Hi!",
  statusText = "Loading Vision Forge..."
}) => {
  if (!isVisible) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        background: '#171717',
        color: '#2187e7',
        display: 'table',
        padding: 0,
        margin: 0
      }}
    >
      <div style={{ display: 'table-cell', verticalAlign: 'middle' }}>
        <div style={{ position: 'relative', maxWidth: '300px', maxHeight: '300px', margin: 'auto' }}>
          {/* Main Circle */}
          <div 
            className="circle"
            style={{
              backgroundColor: 'rgba(0,0,0,0)',
              opacity: 0.9,
              borderRadius: '300px',
              boxShadow: '0 0 75px #2187e7',
              width: '300px',
              height: '300px',
              margin: '0 auto',
              animation: 'spinPulse 2s infinite ease-in-out'
            }}
          />
          
          {/* Inner Circle */}
          <div 
            className="circle1"
            style={{
              backgroundColor: 'rgba(0,0,0,0)',
              border: '5px solid rgba(0,183,229,0.9)',
              opacity: 0.9,
              borderLeft: '5px solid rgba(0,0,0,0)',
              borderRight: '5px solid rgba(0,0,0,0)',
              borderRadius: '250px',
              boxShadow: '0 0 100px #2187e7',
              width: '250px',
              height: '250px',
              margin: '0 auto',
              position: 'absolute',
              top: '20px',
              left: '20px',
              animation: 'spinoffPulse 4s infinite linear'
            }}
          />
          
          {/* Main Content */}
          <div 
            style={{
              position: 'absolute',
              top: 0,
              height: '100%',
              width: '100%',
              cursor: 'pointer',
              borderRadius: '50%'
            }}
          >
            <h2 
              style={{
                visibility: 'visible',
                textAlign: 'center',
                verticalAlign: 'middle',
                marginTop: '50%',
                transform: 'translateY(-50%)',
                color: '#ccc',
                animation: 'fade 3s infinite linear',
                fontSize: '50px',
                margin: 0,
                padding: 0
              }}
            >
              {text}
            </h2>
            
            {/* Audio Bars */}
            <ul 
              style={{
                position: 'fixed',
                zIndex: 3,
                margin: '0 auto',
                left: 0,
                right: 0,
                top: '50%',
                marginTop: '-30px',
                width: '60px',
                height: '60px',
                listStyle: 'none',
                padding: 0
              }}
            >
              <li 
                style={{
                  backgroundColor: '#FFFFFF',
                  width: '10px',
                  height: '10px',
                  float: 'right',
                  marginRight: '5px',
                  boxShadow: '0px 10px 20px rgba(0,0,0,0.2)',
                  animation: 'loadbars 0.6s cubic-bezier(0.645,0.045,0.355,1) infinite 0s'
                }}
              />
              <li 
                style={{
                  backgroundColor: '#FFFFFF',
                  width: '10px',
                  height: '10px',
                  float: 'right',
                  marginRight: '5px',
                  boxShadow: '0px 10px 20px rgba(0,0,0,0.2)',
                  animation: 'loadbars 0.6s ease-in-out infinite -0.2s'
                }}
              />
              <li 
                style={{
                  backgroundColor: '#FFFFFF',
                  width: '10px',
                  height: '10px',
                  float: 'right',
                  marginRight: '5px',
                  boxShadow: '0px 10px 20px rgba(0,0,0,0.2)',
                  animation: 'loadbars 0.6s ease-in-out infinite -0.4s'
                }}
              />
            </ul>
          </div>
        </div>
      </div>
      
      {/* Status Bar */}
      <div 
        style={{
          boxShadow: '0 0 75px #2187e7',
          borderRadius: '15px 15px 0px 0px',
          maxWidth: '300px',
          margin: 'auto',
          color: '#99a',
          padding: '10px',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          fontSize: '10px',
          textAlign: 'center',
          transition: 'all 0.5s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.padding = '15px 10px';
          e.currentTarget.style.fontSize = '12px';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.padding = '10px';
          e.currentTarget.style.fontSize = '10px';
        }}
      >
        <b>Status:</b> {statusText}
      </div>
      
      {/* CSS Animations */}
      <style>{`
        @keyframes spinPulse {
          0% {
            transform: scale(1.1);
          }
          70% {
            transform: scale(0.98);
          }
          100% {
            transform: scale(1.1);
          }
        }
        
        @keyframes spinoffPulse {
          0% {
            transform: rotate(0deg) scale(1);
          }
          10% {
            transform: rotate(90deg);
          }
          20% {
            transform: rotate(-90deg) scale(1.05);
          }
          40% {
            transform: rotate(180deg) scale(0.9);
          }
          70% {
            transform: rotate(-180deg) scale(1.05);
          }
          100% {
            transform: rotate(360deg) scale(1);
          }
        }
        
        @keyframes fade {
          0% { opacity: 1; }
          50% { opacity: 0; }
          100% { opacity: 1; }
        }
        
        @keyframes loadbars {
          0% {
            height: 10px;
            margin-top: 25px;
          }
          50% {
            height: 50px;
            margin-top: 0px;
          }
          100% {
            height: 10px;
            margin-top: 25px;
          }
        }
      `}</style>
    </div>
  );
};
