window.onload = function(){
  let pingSignalInterval = null;
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const deviceName = urlParams.get('deviceName');
  console.log(deviceName);
  if(!deviceName){
    document.querySelector('body').innerHTML = 'Device must have a name';
    return;
  }

  let rtcPeer = null;

  function initWebRtc(socket) { 
    //********************** 
    //Starting a peer connection 
    //********************** 
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => { 
      document.querySelector('video').srcObject = stream;
      socket.off();
      socket.on('listenSignal', (signalData) => {
        clearInterval(pingSignalInterval);
        console.log('listenSignal', signalData.data);
        switch(signalData.type) { 
          case "refresh": 
            window.location.reload();
            break;
          case "rtcSignal": 
            handleRtcSignal(signalData.sessionId, socket, signalData, stream);
             break; 
          case "candidate": 
            handleCandidate(signalData)
             break; 
          default: 
             break; 
       }
      });
    }); 
 };

  const manager = new io.Manager("https://gr6.algonics.net");
  const devicesSocket = manager.socket("/devices");
  devicesSocket.connect();
  devicesSocket.emit('addToConnectedDevices', { deviceName: 'test5'});
 
  const signalingSocket = manager.socket(`/signaling`);
  signalingSocket.connect();
  initWebRtc(signalingSocket);

  devicesSocket.on('sessionInit', (data) => {
    signalingSocket.emit('connectToSession', { sessionId: data.sessionId });
    pingSignalInterval = setInterval(() => {
      signalingSocket.emit("sendSignal",{
          sessionId: data.sessionId,
          type: "initCall", 
          sender: 'device',
      }); 
    }, 1000);
  });


  function handleRtcSignal(sessionId, socket, signalData, stream) { 
    if( signalData.data.type === "offer") {
      const config = {
          "iceServers": [
              { "urls": "stun:stun.l.google.com:19302" },
              { "urls": "stun:stun2.l.google.com:19302" },
              { "urls": "stun:13.36.31.88:3478" },
              
              // public turn server from https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b
              // set your own servers here
              {
                url: 'turn:13.36.31.88:3478',
                credential: 'lina',
                username: 'benchabane'
              }
          ]
      }
      rtcPeer =  new SimplePeer({
        initiator: false,
        trinkle: true,
        stream,
        config
      });
      rtcPeer.removeAllListeners('signal');
      rtcPeer.removeAllListeners('error');
  
      rtcPeer.on('signal', (data) => {
        console.log("sendSignal", data);
          socket.emit("sendSignal",{
            sessionId,
            type: "rtcSignal", 
            data,
            sender: 'device',
        }); 
      });
  
      rtcPeer.on('error', (err) => {
          console.log("err", err);
      });
      rtcPeer.signal(signalData.data);
    } else {
      if (rtcPeer) rtcPeer.signal(signalData.data);
    }

  }

  function handleCandidate(signalData) {
    if(rtcPeer) rtcPeer.signal(signalData.data);
  }
}