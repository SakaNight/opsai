import { Resolver, Query, Mutation, Args, Field, ObjectType, InputType } from '@nestjs/graphql';
import { IncidentService } from './incident.service';

@ObjectType()
class IncidentGQL {
  @Field() _id: string;
  @Field() title: string;
  @Field({ nullable: true }) source?: string;
  @Field() severity: string;
  @Field() status: string;
  @Field() createdAt: Date;
  @Field() updatedAt: Date;
}

@InputType()
class CreateIncidentInput {
  @Field() title: string;
  @Field({ defaultValue: 'low' }) severity?: string;
  @Field({ defaultValue: 'open' }) status?: string;
  @Field({ nullable: true }) source?: string;
}

@Resolver(() => IncidentGQL)
export class IncidentResolver {
  constructor(private readonly svc: IncidentService) {}

  @Query(() => [IncidentGQL])
  incidents() { return this.svc.list(); }

  @Mutation(() => IncidentGQL)
  createIncident(@Args('input') input: CreateIncidentInput) {
    return this.svc.create(input);
  }
}