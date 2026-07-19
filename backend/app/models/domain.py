from typing import Optional
import datetime
import enum

from sqlalchemy import Boolean, Column, Double, Enum, ForeignKey, ForeignKeyConstraint, Index, Integer, PrimaryKeyConstraint, Table, Text, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, TIMESTAMP
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass


class Approvalstatus(str, enum.Enum):
    APPROVED = 'APPROVED'
    PENDING_APPROVAL = 'PENDING_APPROVAL'
    REJECTED = 'REJECTED'


class Channel(str, enum.Enum):
    SMS = 'SMS'
    WHATSAPP = 'WHATSAPP'
    PHONE_CALL = 'PHONE_CALL'
    EMAIL = 'EMAIL'
    OTHER = 'OTHER'
    UNKNOWN = 'UNKNOWN'


class Feedbacktype(str, enum.Enum):
    ACCURATE = 'ACCURATE'
    FALSE_POSITIVE = 'FALSE_POSITIVE'
    FALSE_NEGATIVE = 'FALSE_NEGATIVE'


class Locationsource(str, enum.Enum):
    USER_SUPPLIED = 'USER_SUPPLIED'
    IP_APPROXIMATE = 'IP_APPROXIMATE'


class Nodetype(str, enum.Enum):
    PHONE_NUMBER = 'PHONE_NUMBER'
    UPI_ID = 'UPI_ID'
    BANK_ACCOUNT = 'BANK_ACCOUNT'
    WEBSITE = 'WEBSITE'
    EMAIL = 'EMAIL'
    TELEGRAM_ID = 'TELEGRAM_ID'
    CRYPTO_WALLET = 'CRYPTO_WALLET'
    VICTIM = 'VICTIM'
    IFSC_CODE = 'IFSC_CODE'


class Orgtype(str, enum.Enum):
    CITIZEN = 'CITIZEN'
    BANK = 'BANK'
    LAW_ENFORCEMENT = 'LAW_ENFORCEMENT'
    PLATFORM = 'PLATFORM'


class Severity(str, enum.Enum):
    CRITICAL = 'CRITICAL'
    HIGH = 'HIGH'
    MEDIUM = 'MEDIUM'
    LOW = 'LOW'
    NONE = 'NONE'


class Userrole(str, enum.Enum):
    CITIZEN = 'CITIZEN'
    BANK_ANALYST = 'BANK_ANALYST'
    LAW_ENFORCEMENT = 'LAW_ENFORCEMENT'
    PLATFORM_ADMIN = 'PLATFORM_ADMIN'


class Verdict(str, enum.Enum):
    SCAM = 'SCAM'
    SUSPICIOUS = 'SUSPICIOUS'
    BENIGN = 'BENIGN'
    INSUFFICIENT_EVIDENCE = 'INSUFFICIENT_EVIDENCE'


class StateFinancialImpact(Base):
    __tablename__ = 'StateFinancialImpact'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='StateFinancialImpact_pkey'),
        Index('StateFinancialImpact_state_key', 'state', unique=True)
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    state: Mapped[str] = mapped_column(Text, nullable=False)
    totalIncidents: Mapped[int] = mapped_column(Integer, nullable=False)
    amountReported: Mapped[float] = mapped_column(Double(53), nullable=False)
    lienAmount: Mapped[float] = mapped_column(Double(53), nullable=False)
    refundedAmount: Mapped[float] = mapped_column(Double(53), nullable=False)
    createdAt: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False, server_default=text('CURRENT_TIMESTAMP'))


class CityCoordinates(Base):
    __tablename__ = 'city_coordinates'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='city_coordinates_pkey'),
        Index('city_coordinates_name_state_key', 'name', 'state', unique=True)
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    state: Mapped[str] = mapped_column(Text, nullable=False)
    lat: Mapped[float] = mapped_column(Double(53), nullable=False)
    lng: Mapped[float] = mapped_column(Double(53), nullable=False)


class DistrictCoordinates(Base):
    __tablename__ = 'district_coordinates'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='district_coordinates_pkey'),
        Index('district_coordinates_name_state_key', 'name', 'state', unique=True)
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    state: Mapped[str] = mapped_column(Text, nullable=False)
    lat: Mapped[float] = mapped_column(Double(53), nullable=False)
    lng: Mapped[float] = mapped_column(Double(53), nullable=False)


class GovCityCybercrime(Base):
    __tablename__ = 'gov_city_cybercrime'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='gov_city_cybercrime_pkey'),
        Index('gov_city_cybercrime_city_state_key', 'city', 'state', unique=True)
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    city: Mapped[str] = mapped_column(Text, nullable=False)
    state: Mapped[str] = mapped_column(Text, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    crimeCount: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'NCRB Crime in India 2023'::text"))
    createdAt: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    metadata_: Mapped[Optional[dict]] = mapped_column('metadata', JSONB)


class GovDistrictCybercrime(Base):
    __tablename__ = 'gov_district_cybercrime'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='gov_district_cybercrime_pkey'),
        Index('gov_district_cybercrime_district_state_key', 'district', 'state', unique=True)
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    district: Mapped[str] = mapped_column(Text, nullable=False)
    state: Mapped[str] = mapped_column(Text, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    crimeCount: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'NCRB Crime in India 2023'::text"))
    createdAt: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    metadata_: Mapped[Optional[dict]] = mapped_column('metadata', JSONB)


class GovStateCybercrime(Base):
    __tablename__ = 'gov_state_cybercrime'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='gov_state_cybercrime_pkey'),
        Index('gov_state_cybercrime_state_key', 'state', unique=True)
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    state: Mapped[str] = mapped_column(Text, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    crimeCount: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'NCRB Crime in India 2023'::text"))
    createdAt: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    metadata_: Mapped[Optional[dict]] = mapped_column('metadata', JSONB)


class GroqCallLogs(Base):
    __tablename__ = 'groq_call_logs'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='groq_call_logs_pkey'),
        Index('groq_call_logs_createdAt_idx', 'createdAt'),
        Index('groq_call_logs_success_idx', 'success')
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    payloadHash: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(Text, nullable=False)
    latencyMs: Mapped[int] = mapped_column(Integer, nullable=False)
    promptTokens: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    completionTokens: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    estimatedCost: Mapped[float] = mapped_column(Double(53), nullable=False, server_default=text('0.0'))
    retryCount: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    schemaValid: Mapped[bool] = mapped_column(Boolean, nullable=False)
    degraded: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    injectionDetected: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    createdAt: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    errorMessage: Mapped[Optional[str]] = mapped_column(Text)
    reportId: Mapped[Optional[str]] = mapped_column(Text)
    
    threat_reports: Mapped[Optional['ThreatReports']] = relationship('ThreatReports', back_populates='groq_call_log', foreign_keys="[ThreatReports.groqCallLogId]")


class NumberReputations(Base):
    __tablename__ = 'number_reputations'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='number_reputations_pkey'),
        Index('number_reputations_phoneNumber_key', 'phoneNumber', unique=True)
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    phoneNumber: Mapped[str] = mapped_column(Text, nullable=False)
    reportsCount: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    riskScore: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    riskLevel: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'Low'::text"))
    lastReportedAt: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    scamCategory: Mapped[Optional[str]] = mapped_column(Text)


class Organizations(Base):
    __tablename__ = 'organizations'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='organizations_pkey'),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[Orgtype] = mapped_column(Enum(Orgtype, values_callable=lambda cls: [member.value for member in cls], name='OrgType'), nullable=False, server_default=text('\'CITIZEN\'::"OrgType"'))
    createdAt: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    updatedAt: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False)

    users: Mapped[list['Users']] = relationship('Users', back_populates='organizations')
    threat_reports: Mapped[list['ThreatReports']] = relationship('ThreatReports', back_populates='organizations')
    geo_events: Mapped[list['GeoEvents']] = relationship('GeoEvents', back_populates='organizations')
    network_nodes: Mapped[list['NetworkNodes']] = relationship('NetworkNodes', back_populates='organizations')
    network_edges: Mapped[list['NetworkEdges']] = relationship('NetworkEdges', back_populates='organizations')


class PhoneReputations(Base):
    __tablename__ = 'phone_reputations'
    __table_args__ = (
        PrimaryKeyConstraint('phoneNumber', name='phone_reputations_pkey'),
    )

    phoneNumber: Mapped[str] = mapped_column(Text, primary_key=True)
    reportCount: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    lastReportedAt: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    aggregatedRiskScore: Mapped[float] = mapped_column(Double(53), nullable=False, server_default=text('0'))
    dominantSeverity: Mapped[Severity] = mapped_column(Enum(Severity, values_callable=lambda cls: [member.value for member in cls], name='Severity'), nullable=False, server_default=text('\'NONE\'::"Severity"'))
    updatedAt: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False)
    dominantFraudType: Mapped[Optional[str]] = mapped_column(Text)

    threat_reports: Mapped[list['ThreatReports']] = relationship('ThreatReports', back_populates='phone_reputations')


class Reports(Base):
    __tablename__ = 'reports'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='reports_pkey'),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    phoneNumber: Mapped[str] = mapped_column(Text, nullable=False)
    createdAt: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    transcript: Mapped[Optional[str]] = mapped_column(Text)
    riskScore: Mapped[Optional[int]] = mapped_column(Integer)
    riskLevel: Mapped[Optional[str]] = mapped_column(Text)
    fraudType: Mapped[Optional[str]] = mapped_column(Text)
    confidence: Mapped[Optional[float]] = mapped_column(Double(53))
    indicators: Mapped[Optional[str]] = mapped_column(Text)
    actions: Mapped[Optional[str]] = mapped_column(Text)


class StateCoordinates(Base):
    __tablename__ = 'state_coordinates'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='state_coordinates_pkey'),
        Index('state_coordinates_name_key', 'name', unique=True)
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    lat: Mapped[float] = mapped_column(Double(53), nullable=False)
    lng: Mapped[float] = mapped_column(Double(53), nullable=False)


t_verification_tokens = Table(
    'verification_tokens', Base.metadata,
    Column('identifier', Text, nullable=False),
    Column('token', Text, nullable=False),
    Column('expires', TIMESTAMP(precision=3), nullable=False),
    Index('verification_tokens_identifier_token_key', 'identifier', 'token', unique=True),
    Index('verification_tokens_token_key', 'token', unique=True)
)


class Users(Base):
    __tablename__ = 'users'
    __table_args__ = (
        ForeignKeyConstraint(['organizationId'], ['organizations.id'], ondelete='RESTRICT', onupdate='CASCADE', name='users_organizationId_fkey'),
        PrimaryKeyConstraint('id', name='users_pkey'),
        Index('users_email_key', 'email', unique=True)
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[Userrole] = mapped_column(Enum(Userrole, values_callable=lambda cls: [member.value for member in cls], name='UserRole'), nullable=False, server_default=text('\'CITIZEN\'::"UserRole"'))
    approvalStatus: Mapped[Approvalstatus] = mapped_column(Enum(Approvalstatus, values_callable=lambda cls: [member.value for member in cls], name='ApprovalStatus'), nullable=False, server_default=text('\'APPROVED\'::"ApprovalStatus"'))
    organizationId: Mapped[str] = mapped_column(Text, nullable=False)
    createdAt: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    updatedAt: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False)
    passwordHash: Mapped[Optional[str]] = mapped_column(Text)
    name: Mapped[Optional[str]] = mapped_column(Text)
    phone: Mapped[Optional[str]] = mapped_column(Text)

    organizations: Mapped['Organizations'] = relationship('Organizations', back_populates='users')
    accounts: Mapped[list['Accounts']] = relationship('Accounts', back_populates='users')
    sessions: Mapped[list['Sessions']] = relationship('Sessions', back_populates='users')
    refresh_tokens: Mapped[list['RefreshTokens']] = relationship('RefreshTokens', back_populates='users')
    threat_reports: Mapped[list['ThreatReports']] = relationship('ThreatReports', back_populates='users')
    verdict_feedback: Mapped[list['VerdictFeedback']] = relationship('VerdictFeedback', back_populates='users')


class Accounts(Base):
    __tablename__ = 'accounts'
    __table_args__ = (
        ForeignKeyConstraint(['userId'], ['users.id'], ondelete='CASCADE', onupdate='CASCADE', name='accounts_userId_fkey'),
        PrimaryKeyConstraint('id', name='accounts_pkey'),
        Index('accounts_provider_providerAccountId_key', 'provider', 'providerAccountId', unique=True)
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    userId: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(Text, nullable=False)
    provider: Mapped[str] = mapped_column(Text, nullable=False)
    providerAccountId: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token: Mapped[Optional[str]] = mapped_column(Text)
    access_token: Mapped[Optional[str]] = mapped_column(Text)
    expires_at: Mapped[Optional[int]] = mapped_column(Integer)
    token_type: Mapped[Optional[str]] = mapped_column(Text)
    scope: Mapped[Optional[str]] = mapped_column(Text)
    id_token: Mapped[Optional[str]] = mapped_column(Text)
    session_state: Mapped[Optional[str]] = mapped_column(Text)

    users: Mapped['Users'] = relationship('Users', back_populates='accounts')


class Sessions(Base):
    __tablename__ = 'sessions'
    __table_args__ = (
        ForeignKeyConstraint(['userId'], ['users.id'], ondelete='CASCADE', onupdate='CASCADE', name='sessions_userId_fkey'),
        PrimaryKeyConstraint('id', name='sessions_pkey'),
        Index('sessions_sessionToken_key', 'sessionToken', unique=True)
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    sessionToken: Mapped[str] = mapped_column(Text, nullable=False)
    userId: Mapped[str] = mapped_column(Text, nullable=False)
    expires: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False)

    users: Mapped['Users'] = relationship('Users', back_populates='sessions')


class RefreshTokens(Base):
    __tablename__ = 'refresh_tokens'
    __table_args__ = (
        ForeignKeyConstraint(['userId'], ['users.id'], ondelete='CASCADE', onupdate='CASCADE', name='refresh_tokens_userId_fkey'),
        PrimaryKeyConstraint('id', name='refresh_tokens_pkey'),
        Index('refresh_tokens_token_key', 'token', unique=True)
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    token: Mapped[str] = mapped_column(Text, nullable=False)
    userId: Mapped[str] = mapped_column(Text, nullable=False)
    expiresAt: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))

    users: Mapped['Users'] = relationship('Users', back_populates='refresh_tokens')


class ThreatReports(Base):
    __tablename__ = 'threat_reports'
    __table_args__ = (
        ForeignKeyConstraint(['createdByUserId'], ['users.id'], ondelete='SET NULL', onupdate='CASCADE', name='threat_reports_createdByUserId_fkey'),
        ForeignKeyConstraint(['organizationId'], ['organizations.id'], ondelete='SET NULL', onupdate='CASCADE', name='threat_reports_organizationId_fkey'),
        ForeignKeyConstraint(['targetPhoneNumber'], ['phone_reputations.phoneNumber'], ondelete='RESTRICT', onupdate='CASCADE', name='threat_reports_targetPhoneNumber_fkey'),
        PrimaryKeyConstraint('id', name='threat_reports_pkey'),
        Index('threat_reports_createdAt_idx', 'createdAt'),
        Index('threat_reports_organizationId_idx', 'organizationId'),
        Index('threat_reports_targetPhoneNumber_idx', 'targetPhoneNumber'),
        Index('threat_reports_verdict_idx', 'verdict')
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    targetPhoneNumber: Mapped[str] = mapped_column(Text, nullable=False)
    payloadHash: Mapped[str] = mapped_column(Text, nullable=False)
    channel: Mapped[Channel] = mapped_column(Enum(Channel, values_callable=lambda cls: [member.value for member in cls], name='Channel'), nullable=False, server_default=text('\'UNKNOWN\'::"Channel"'))
    verdict: Mapped[Verdict] = mapped_column(Enum(Verdict, values_callable=lambda cls: [member.value for member in cls], name='Verdict'), nullable=False)
    severity: Mapped[Severity] = mapped_column(Enum(Severity, values_callable=lambda cls: [member.value for member in cls], name='Severity'), nullable=False)
    confidenceScore: Mapped[float] = mapped_column(Double(53), nullable=False)
    timelineSteps: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    escalate: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    createdAt: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    payloadText: Mapped[Optional[str]] = mapped_column(Text)
    fraudType: Mapped[Optional[str]] = mapped_column(Text)
    tags: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text()))
    reasoning: Mapped[Optional[str]] = mapped_column(Text)
    createdByUserId: Mapped[Optional[str]] = mapped_column(Text)
    sourceIp: Mapped[Optional[str]] = mapped_column(Text)
    organizationId: Mapped[Optional[str]] = mapped_column(Text)
    groqCallLogId: Mapped[Optional[str]] = mapped_column(Text, ForeignKey('groq_call_logs.id', ondelete='SET NULL'))
    officerNotes: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    evidenceHistory: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    auditTrail: Mapped[Optional[dict]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    financialExposure: Mapped[Optional[float]] = mapped_column(Double(53))

    users: Mapped[Optional['Users']] = relationship('Users', back_populates='threat_reports')
    organizations: Mapped[Optional['Organizations']] = relationship('Organizations', back_populates='threat_reports')
    groq_call_log: Mapped[Optional['GroqCallLogs']] = relationship('GroqCallLogs', back_populates='threat_reports', foreign_keys=[groqCallLogId])
    phone_reputations: Mapped['PhoneReputations'] = relationship('PhoneReputations', back_populates='threat_reports')
    geo_events: Mapped[list['GeoEvents']] = relationship('GeoEvents', back_populates='threat_reports')
    network_nodes: Mapped[list['NetworkNodes']] = relationship('NetworkNodes', back_populates='threat_reports')
    verdict_feedback: Mapped[list['VerdictFeedback']] = relationship('VerdictFeedback', back_populates='threat_reports')


class GeoEvents(Base):
    __tablename__ = 'geo_events'
    __table_args__ = (
        ForeignKeyConstraint(['organizationId'], ['organizations.id'], ondelete='SET NULL', onupdate='CASCADE', name='geo_events_organizationId_fkey'),
        ForeignKeyConstraint(['reportId'], ['threat_reports.id'], ondelete='RESTRICT', onupdate='CASCADE', name='geo_events_reportId_fkey'),
        PrimaryKeyConstraint('id', name='geo_events_pkey'),
        Index('geo_events_createdAt_idx', 'createdAt'),
        Index('geo_events_severity_idx', 'severity')
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    lat: Mapped[float] = mapped_column(Double(53), nullable=False)
    lng: Mapped[float] = mapped_column(Double(53), nullable=False)
    reportId: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[Severity] = mapped_column(Enum(Severity, values_callable=lambda cls: [member.value for member in cls], name='Severity'), nullable=False)
    locationSource: Mapped[Locationsource] = mapped_column(Enum(Locationsource, values_callable=lambda cls: [member.value for member in cls], name='LocationSource'), nullable=False)
    createdAt: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    district: Mapped[Optional[str]] = mapped_column(Text)
    state: Mapped[Optional[str]] = mapped_column(Text)
    pincode: Mapped[Optional[str]] = mapped_column(Text)
    organizationId: Mapped[Optional[str]] = mapped_column(Text)

    organizations: Mapped[Optional['Organizations']] = relationship('Organizations', back_populates='geo_events')
    threat_reports: Mapped['ThreatReports'] = relationship('ThreatReports', back_populates='geo_events')


class NetworkNodes(Base):
    __tablename__ = 'network_nodes'
    __table_args__ = (
        ForeignKeyConstraint(['organizationId'], ['organizations.id'], ondelete='SET NULL', onupdate='CASCADE', name='network_nodes_organizationId_fkey'),
        ForeignKeyConstraint(['reportId'], ['threat_reports.id'], ondelete='RESTRICT', onupdate='CASCADE', name='network_nodes_reportId_fkey'),
        PrimaryKeyConstraint('id', name='network_nodes_pkey'),
        Index('network_nodes_entityValue_idx', 'entityValue'),
        Index('network_nodes_createdAt_idx', 'createdAt'),
        Index('network_nodes_entityValue_reportId_key', 'entityValue', 'reportId', unique=True)
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    entityType: Mapped[Nodetype] = mapped_column(Enum(Nodetype, values_callable=lambda cls: [member.value for member in cls], name='NodeType'), nullable=False)
    entityValue: Mapped[str] = mapped_column(Text, nullable=False)
    reportId: Mapped[str] = mapped_column(Text, nullable=False)
    createdAt: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    label: Mapped[Optional[str]] = mapped_column(Text)
    organizationId: Mapped[Optional[str]] = mapped_column(Text)
    details: Mapped[Optional[dict]] = mapped_column("metadata", JSONB)

    organizations: Mapped[Optional['Organizations']] = relationship('Organizations', back_populates='network_nodes')
    threat_reports: Mapped['ThreatReports'] = relationship('ThreatReports', back_populates='network_nodes')
    network_edges_sourceNodeId: Mapped[list['NetworkEdges']] = relationship('NetworkEdges', foreign_keys='[NetworkEdges.sourceNodeId]', back_populates='network_nodes')
    network_edges_targetNodeId: Mapped[list['NetworkEdges']] = relationship('NetworkEdges', foreign_keys='[NetworkEdges.targetNodeId]', back_populates='network_nodes_')


class VerdictFeedback(Base):
    __tablename__ = 'verdict_feedback'
    __table_args__ = (
        ForeignKeyConstraint(['reportId'], ['threat_reports.id'], ondelete='RESTRICT', onupdate='CASCADE', name='verdict_feedback_reportId_fkey'),
        ForeignKeyConstraint(['userId'], ['users.id'], ondelete='SET NULL', onupdate='CASCADE', name='verdict_feedback_userId_fkey'),
        PrimaryKeyConstraint('id', name='verdict_feedback_pkey'),
        Index('verdict_feedback_reportId_idx', 'reportId')
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    reportId: Mapped[str] = mapped_column(Text, nullable=False)
    feedback: Mapped[Feedbacktype] = mapped_column(Enum(Feedbacktype, values_callable=lambda cls: [member.value for member in cls], name='FeedbackType'), nullable=False)
    createdAt: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    userId: Mapped[Optional[str]] = mapped_column(Text)
    comment: Mapped[Optional[str]] = mapped_column(Text)

    threat_reports: Mapped['ThreatReports'] = relationship('ThreatReports', back_populates='verdict_feedback')
    users: Mapped[Optional['Users']] = relationship('Users', back_populates='verdict_feedback')


class NetworkEdges(Base):
    __tablename__ = 'network_edges'
    __table_args__ = (
        ForeignKeyConstraint(['organizationId'], ['organizations.id'], ondelete='SET NULL', onupdate='CASCADE', name='network_edges_organizationId_fkey'),
        ForeignKeyConstraint(['sourceNodeId'], ['network_nodes.id'], ondelete='RESTRICT', onupdate='CASCADE', name='network_edges_sourceNodeId_fkey'),
        ForeignKeyConstraint(['targetNodeId'], ['network_nodes.id'], ondelete='RESTRICT', onupdate='CASCADE', name='network_edges_targetNodeId_fkey'),
        PrimaryKeyConstraint('id', name='network_edges_pkey'),
        Index('network_edges_sourceNodeId_idx', 'sourceNodeId'),
        Index('network_edges_targetNodeId_idx', 'targetNodeId'),
        Index('network_edges_createdAt_idx', 'createdAt')
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    sourceNodeId: Mapped[str] = mapped_column(Text, nullable=False)
    targetNodeId: Mapped[str] = mapped_column(Text, nullable=False)
    weight: Mapped[float] = mapped_column(Double(53), nullable=False, server_default=text('1.0'))
    reportId: Mapped[str] = mapped_column(Text, nullable=False)
    createdAt: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    organizationId: Mapped[Optional[str]] = mapped_column(Text)

    organizations: Mapped[Optional['Organizations']] = relationship('Organizations', back_populates='network_edges')
    network_nodes: Mapped['NetworkNodes'] = relationship('NetworkNodes', foreign_keys=[sourceNodeId], back_populates='network_edges_sourceNodeId')
    network_nodes_: Mapped['NetworkNodes'] = relationship('NetworkNodes', foreign_keys=[targetNodeId], back_populates='network_edges_targetNodeId')
