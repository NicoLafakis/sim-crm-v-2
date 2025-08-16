# SimCRM User Flow - Complete Journey

## Mermaid Flowchart

```mermaid
flowchart TD
    %% Entry Points
    Start([User Visits Application]) --> DevCheck{Development Mode?}
    DevCheck -->|Yes| DevBypass[Auto-login with DevUser]
    DevCheck -->|No| LoginCheck{Authenticated?}
    
    %% Authentication Flow
    LoginCheck -->|No| LoginPage[🎮 Login Page<br/>Player Name & Passcode]
    LoginPage --> AuthChoice{Login or Register?}
    AuthChoice -->|Register| ValidatePass[Validate Passcode<br/>- 1 uppercase letter<br/>- 1 lowercase letter<br/>- 1 special character<br/>- Min 6 characters]
    ValidatePass -->|Valid| CreateAccount[Create User Account]
    ValidatePass -->|Invalid| AuthError[❌ Show Error]
    AuthError --> LoginPage
    AuthChoice -->|Login| CheckCreds[Verify Credentials]
    CheckCreds -->|Valid| CreateSession[Create User Session]
    CheckCreds -->|Invalid| AuthError
    CreateAccount --> CreateSession
    
    %% Main Flow After Authentication
    DevBypass --> SaasSelect
    CreateSession --> SaasSelect[🛠️ SaaS Selection Page<br/>Choose CRM Platform]
    LoginCheck -->|Yes| SaasSelect
    
    %% SaaS Selection
    SaasSelect --> SaasChoice{Choose Platform}
    SaasChoice -->|HubSpot| HubSpotSetup[🔗 HubSpot Setup Page<br/>API Token Configuration]
    SaasChoice -->|Other CRM| ComingSoon[❌ Coming Soon Message]
    ComingSoon --> SaasSelect
    
    %% HubSpot Setup & Validation
    HubSpotSetup --> TokenInput[Enter HubSpot Token]
    TokenInput --> ComprehensiveValidation[🔍 Comprehensive Token Validation]
    ComprehensiveValidation --> ValidationSteps[Multi-Step Validation:<br/>✓ Token Format Check<br/>✓ API Connectivity Test<br/>✓ Permissions Verification<br/>✓ Cache Owners & Pipelines<br/>✓ Deal Stages Retrieval]
    ValidationSteps --> ValidationResult{All Steps Pass?}
    ValidationResult -->|No| ValidationError[❌ Show Detailed Errors]
    ValidationError --> TokenInput
    ValidationResult -->|Yes| SaveToken[💾 Save Token to Session]
    SaveToken --> ThemeSelect
    
    %% Theme Selection
    ThemeSelect[🎨 Theme Selection Page<br/>Choose Simulation Theme]
    ThemeSelect --> ThemeChoice{Select Theme}
    ThemeChoice -->|Generic| SaveTheme[Save Theme to Session]
    ThemeChoice -->|Professional| SaveTheme
    ThemeChoice -->|Creative| SaveTheme
    ThemeChoice -->|Startup| SaveTheme
    SaveTheme --> IndustrySelect
    
    %% Industry Selection
    IndustrySelect[🏭 Industry Selection Page<br/>Choose Business Industry]
    IndustrySelect --> IndustryChoice{Select Industry}
    IndustryChoice -->|SaaS| SaveIndustry[Save Industry to Session]
    IndustryChoice -->|E-commerce| SaveIndustry
    IndustryChoice -->|Healthcare| SaveIndustry
    IndustryChoice -->|Finance| SaveIndustry
    IndustryChoice -->|Education| SaveIndustry
    IndustryChoice -->|Real Estate| SaveIndustry
    IndustryChoice -->|Other...| SaveIndustry
    SaveIndustry --> RecordFreq
    
    %% Record Frequency Configuration
    RecordFreq[🎛️ Record Frequency Page<br/>WinAmp-style Mixer Interface]
    RecordFreq --> ConfigSliders[Configure Record Distribution:<br/>• Contacts (0-30)<br/>• Companies (0-30)<br/>• Deals (0-30)<br/>• Tickets (0-30)<br/>• Notes (0-30)<br/>Max Total: 150 records]
    ConfigSliders --> TimeSpanSelect[Select Time Span:<br/>• 1 day (12 hours compressed)<br/>• 7 days<br/>• 30 days<br/>• 90 days]
    TimeSpanSelect --> AIStrategy[🤖 Generate AI Strategy]
    
    %% AI Strategy Generation
    AIStrategy --> CallOpenAI[Call OpenAI gpt-5-nano<br/>Generate Business Scenario]
    CallOpenAI --> AIResponse{AI Response Success?}
    AIResponse -->|No| AIError[❌ AI Generation Failed]
    AIError --> RecordFreq
    AIResponse -->|Yes| ShowStrategy[📊 Display AI Strategy<br/>& Configuration Summary]
    ShowStrategy --> ConfirmStart{User Confirms Start?}
    ConfirmStart -->|No| RecordFreq
    ConfirmStart -->|Yes| CreateSimulation[🚀 Create Simulation Record]
    
    %% Simulation Creation & Execution
    CreateSimulation --> CreateJob[Create Background Job<br/>with CSV Timing Template]
    CreateJob --> ScheduleSteps[📅 Schedule Job Steps<br/>Based on Template & Time Scaling]
    ScheduleSteps --> RedirectProgress[Redirect to Progress Page]
    RedirectProgress --> ProgressPage
    
    %% Progress Page - Real-time Monitoring
    ProgressPage[📈 Progress Page<br/>Real-time Simulation Monitoring]
    ProgressPage --> DisplayProgress[Display:<br/>• Live Timer<br/>• Countdown to Completion<br/>• Current Status<br/>• Records Created Count<br/>• AI Strategy Details<br/>• Configuration Summary]
    DisplayProgress --> JobRunner[⚙️ Background Job Runner<br/>30-second intervals]
    
    %% Job Execution Loop
    JobRunner --> CheckDue{Steps Due for Execution?}
    CheckDue -->|No| WaitNext[⏱️ Wait 30 seconds]
    WaitNext --> JobRunner
    CheckDue -->|Yes| ExecuteStep[Execute Job Step]
    ExecuteStep --> StepType{Step Type}
    
    %% Different Step Types
    StepType -->|create_contact| CreateContact[📞 Create HubSpot Contact<br/>with AI-generated data]
    StepType -->|create_company| CreateCompany[🏢 Create HubSpot Company<br/>with AI-generated data]
    StepType -->|create_deal| CreateDeal[💰 Create HubSpot Deal<br/>with associations]
    StepType -->|create_ticket| CreateTicket[🎫 Create HubSpot Ticket]
    StepType -->|create_note| CreateNote[📝 Create HubSpot Note]
    StepType -->|update_deal| UpdateDeal[📝 Update Deal Status]
    StepType -->|update_ticket| UpdateTicket[🔄 Update Ticket]
    StepType -->|close_ticket| CloseTicket[✅ Close Ticket]
    
    %% Step Execution Results
    CreateContact --> StepResult[Record Step Result]
    CreateCompany --> StepResult
    CreateDeal --> StepResult
    CreateTicket --> StepResult
    CreateNote --> StepResult
    UpdateDeal --> StepResult
    UpdateTicket --> StepResult
    CloseTicket --> StepResult
    
    StepResult --> UpdateProgress[Update Progress Display]
    UpdateProgress --> CheckComplete{All Steps Complete?}
    CheckComplete -->|No| JobRunner
    CheckComplete -->|Yes| CompleteSimulation[✅ Mark Simulation Complete]
    CompleteSimulation --> FinalResults[📊 Display Final Results]
    
    %% User Control Options
    ProgressPage --> UserActions{User Actions}
    UserActions -->|Stop Simulation| StopButton[🛑 Stop Button Clicked]
    UserActions -->|View Details| ExpandDetails[📋 Expand Configuration Details]
    UserActions -->|New Simulation| BackToFreq[Return to Record Frequency]
    UserActions -->|Profile| ProfilePage[👤 Profile Page]
    UserActions -->|Home| SaasSelect
    
    %% Stop Functionality
    StopButton --> StopAPI[Call Stop API]
    StopAPI --> CancelSteps[Cancel Pending Job Steps]
    CancelSteps --> UpdateStatus[Update Status to 'stopped']
    UpdateStatus --> StoppedDisplay[Display Stopped Status]
    
    %% Navigation & Persistent Elements
    BackToFreq --> RecordFreq
    ProfilePage --> ManageProfile[Manage User Profile<br/>& HubSpot Connection]
    ExpandDetails --> DetailView[Show:<br/>• CSV Template Used<br/>• Timing Configuration<br/>• Industry-specific vs Universal<br/>• Credit Usage<br/>• Error Log]
    
    %% Floating Menu - Always Available
    SaasSelect -.-> FloatingMenu[🎯 Floating Menu]
    ThemeSelect -.-> FloatingMenu
    IndustrySelect -.-> FloatingMenu
    RecordFreq -.-> FloatingMenu
    ProgressPage -.-> FloatingMenu
    ProfilePage -.-> FloatingMenu
    
    FloatingMenu --> MenuOptions{Menu Choice}
    MenuOptions -->|Home| SaasSelect
    MenuOptions -->|Progress| ProgressPage
    MenuOptions -->|Profile| ProfilePage
    
    %% Styling
    classDef startNode fill:#e1f5fe,stroke:#01579b,stroke-width:2px,color:#000
    classDef pageNode fill:#f3e5f5,stroke:#4a148c,stroke-width:2px,color:#000
    classDef processNode fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px,color:#000
    classDef decisionNode fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#000
    classDef errorNode fill:#ffebee,stroke:#c62828,stroke-width:2px,color:#000
    classDef successNode fill:#e0f2f1,stroke:#00695c,stroke-width:2px,color:#000
    
    class Start,DevBypass startNode
    class LoginPage,SaasSelect,HubSpotSetup,ThemeSelect,IndustrySelect,RecordFreq,ProgressPage,ProfilePage pageNode
    class CreateAccount,CreateSession,SaveToken,SaveTheme,SaveIndustry,CreateSimulation,CreateJob,ScheduleSteps,ExecuteStep,CreateContact,CreateCompany,CreateDeal,CreateTicket,CreateNote,UpdateDeal,UpdateTicket,CloseTicket,StepResult,UpdateProgress,CompleteSimulation processNode
    class DevCheck,LoginCheck,AuthChoice,ValidationResult,SaasChoice,ThemeChoice,IndustryChoice,ConfirmStart,CheckDue,StepType,CheckComplete,UserActions,MenuOptions decisionNode
    class AuthError,ValidationError,ComingSoon,AIError errorNode
    class FinalResults,StoppedDisplay,CompleteSimulation successNode
```

## Key Flow Characteristics

### 🎮 **Game Boy Aesthetic**
- Retro 8-bit styling throughout
- Custom animations and scanlines
- Press Start 2P font
- Authentic gaming experience

### 🔐 **Authentication & Security**
- Secure user registration with password validation
- Session-based authentication
- Development bypass for testing

### 🛠️ **HubSpot Integration**
- Comprehensive API token validation
- Real-time connectivity testing
- Automatic owner and pipeline caching
- Write permission verification

### 🎨 **Simulation Configuration**
- Theme selection influences AI generation context
- Industry selection customizes business scenarios
- WinAmp-style mixer interface for record distribution
- Time span configuration with compression options

### 🤖 **AI-Powered Generation**
- OpenAI gpt-5-nano integration
- Dynamic business scenario creation
- Industry and theme-specific data generation
- Realistic CRM simulation strategies

### ⚙️ **Background Execution**
- 30-second job runner intervals
- CSV-based timing templates
- Staggered record creation
- Real-time progress tracking

### 🎯 **User Experience**
- Persistent floating navigation menu
- Real-time progress monitoring
- Live timers and countdowns
- Detailed configuration displays
- Stop/start simulation controls

### 📊 **Progress Tracking**
- Live execution status
- Record creation counts
- Error logging and handling
- Credit usage monitoring
- Detailed step-by-step progress

This comprehensive flow ensures users have a smooth journey from initial login through complete simulation execution, with robust error handling, real-time feedback, and authentic CRM data generation throughout the process.