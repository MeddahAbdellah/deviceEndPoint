window.onload = function(){
  let rtcPeer = null;

  function initWebRtc(socket) { 
    //********************** 
    //Starting a peer connection 
    //********************** 
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => { 
      document.querySelector('video').srcObject = stream;
      socket.off();
      socket.on('listenSignal', (signalData) => {
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
  });


  function handleRtcSignal(sessionId, socket, signalData, stream) { 
    if( signalData.data.type === "offer") {
      rtcPeer =  new SimplePeer({
        initiator: false,
        trinkle: false,
        stream,
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